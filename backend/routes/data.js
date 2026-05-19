const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Board = require('../models/Board');
const Invite = require('../models/Invite');
const SharedBoard = require('../models/SharedBoard');
const BannedUser = require('../models/BannedUser');
const User = require('../models/User');

const router = express.Router();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Helper: Build full board data for a user (used by GET and WebSocket push)
async function buildUserBoardData(userId) {
  let boardDoc = await Board.findOne({ userId });
  if (!boardDoc) {
    boardDoc = new Board({ userId });
    await boardDoc.save();
  }

  let responseData = JSON.parse(JSON.stringify(boardDoc.data));
  if (!responseData.boards) responseData.boards = [];

  const mySharedBoards = await SharedBoard.find({ ownerId: userId });
  responseData.boards.forEach(board => {
    board.hasCollaborators = mySharedBoards.some(sb => sb.boardId === board.id);
  });

  const sharedLinks = await SharedBoard.find({ guestId: userId }).populate('ownerId', 'username email');
  for (const link of sharedLinks) {
    const ownerBoardDoc = await Board.findOne({ userId: link.ownerId._id });
    if (ownerBoardDoc && ownerBoardDoc.data && ownerBoardDoc.data.boards) {
      const sharedBoard = ownerBoardDoc.data.boards.find(b => b.id === link.boardId);
      if (sharedBoard) {
        sharedBoard.isShared = true;
        sharedBoard.ownerId = link.ownerId._id;
        sharedBoard.ownerName = link.ownerId.username;
        responseData.boards.push(sharedBoard);
      }
    }
  }

  return responseData;
}

// Get User Data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const responseData = await buildUserBoardData(req.user.id);
    res.json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Update User Data
router.post('/', authenticateToken, async (req, res) => {
  try {
    const incomingData = req.body;
    let ownedBoards = [];
    let sharedBoards = [];

    if (incomingData.boards) {
      incomingData.boards.forEach(b => {
        if (b.isShared) sharedBoards.push(b);
        else ownedBoards.push(b);
      });
    }

    // Save Owned Boards
    let boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc) {
      boardDoc = new Board({ userId: req.user.id, data: { ...incomingData, boards: ownedBoards } });
    } else {
      boardDoc.data = { ...incomingData, boards: ownedBoards };
      boardDoc.updatedAt = Date.now();
    }
    boardDoc.markModified('data');
    await boardDoc.save();

    // Save Shared Boards back to their original owners
    const notifiedOwners = new Set();
    for (const b of sharedBoards) {
      const ownerBoardDoc = await Board.findOne({ userId: b.ownerId });
      if (ownerBoardDoc && ownerBoardDoc.data && ownerBoardDoc.data.boards) {
        const index = ownerBoardDoc.data.boards.findIndex(ob => ob.id === b.id);
        if (index !== -1) {
          const cleanBoard = { ...b };
          delete cleanBoard.isShared;
          delete cleanBoard.ownerId;
          delete cleanBoard.ownerName;
          ownerBoardDoc.data.boards[index] = cleanBoard;
          ownerBoardDoc.updatedAt = Date.now();
          ownerBoardDoc.markModified('data');
          await ownerBoardDoc.save();
          notifiedOwners.add(b.ownerId.toString());
        }
      }
    }

    // --- Real-time WebSocket push with full data ---
    const emitToUser = req.app.get('emitToUser');
    if (emitToUser) {
      // Collect all unique user IDs that need to be notified
      const usersToNotify = new Set();

      // 1. Guests of the current user's owned boards
      const mySharedLinks = await SharedBoard.find({ ownerId: req.user.id });
      mySharedLinks.forEach(link => usersToNotify.add(link.guestId.toString()));

      // 2. Owners whose shared boards were modified
      notifiedOwners.forEach(ownerId => usersToNotify.add(ownerId));

      // 3. Other guests of the same owner's boards
      for (const ownerId of notifiedOwners) {
        const otherGuests = await SharedBoard.find({ ownerId });
        otherGuests.forEach(link => {
          if (link.guestId.toString() !== req.user.id) {
            usersToNotify.add(link.guestId.toString());
          }
        });
      }

      // Build and push full board data for each user (no re-fetch needed)
      for (const targetUserId of usersToNotify) {
        try {
          const userData = await buildUserBoardData(targetUserId);
          emitToUser(targetUserId, 'board-updated', { boardData: userData });
        } catch (e) {
          console.error('Failed to push data to user', targetUserId, e);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Generate Invite Code
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const { boardId, forceNew } = req.body;
    if (!boardId) return res.status(400).json({ message: 'Board ID is required' });

    // Verify ownership
    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    if (forceNew) {
      await Invite.deleteMany({ ownerId: req.user.id, boardId });
    } else {
      // Check if an active invite already exists for this board
      const existingInvite = await Invite.findOne({ ownerId: req.user.id, boardId });
      if (existingInvite) {
        const expiresAt = new Date(existingInvite.createdAt.getTime() + 10 * 60000).toISOString();
        return res.json({ code: existingInvite.code, expiresAt });
      }
    }

    // Generate random 6 character code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const invite = new Invite({
      code,
      ownerId: req.user.id,
      boardId
    });

    await invite.save();
    const expiresAt = new Date(invite.createdAt.getTime() + 10 * 60000).toISOString();
    res.json({ code, expiresAt });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Join Board using Code
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const invite = await Invite.findOne({ code: code.toUpperCase() });
    if (!invite) return res.status(404).json({ message: 'Invalid or expired invite code' });

    if (invite.ownerId.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot join your own board' });
    }

    // Check if banned
    const isBanned = await BannedUser.findOne({ ownerId: invite.ownerId, bannedUserId: req.user.id, boardId: invite.boardId });
    if (isBanned) {
      return res.status(403).json({ message: 'You have been banned from this board' });
    }

    // Check if already joined
    const existing = await SharedBoard.findOne({ guestId: req.user.id, boardId: invite.boardId });
    if (existing) {
      return res.status(400).json({ message: 'You have already joined this board' });
    }

    const sharedBoard = new SharedBoard({
      ownerId: invite.ownerId,
      guestId: req.user.id,
      boardId: invite.boardId
    });

    await sharedBoard.save();

    // Notify the board owner so they see the new collaborator instantly
    const emitToUser = req.app.get('emitToUser');
    if (emitToUser) {
      try {
        const ownerData = await buildUserBoardData(invite.ownerId.toString());
        emitToUser(invite.ownerId.toString(), 'board-updated', { boardData: ownerData });
      } catch (e) {
        console.error('Failed to push data to board owner', e);
      }
    }

    res.json({ success: true, message: 'Successfully joined board' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'You have already joined this board' });
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Leave Shared Board
router.post('/leave', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.body;
    if (!boardId) return res.status(400).json({ message: 'Board ID is required' });

    await SharedBoard.findOneAndDelete({ guestId: req.user.id, boardId });
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Get Collaborators for a Board (owner only)
router.get('/collaborators/:boardId', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    // Verify ownership
    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    const sharedBoards = await SharedBoard.find({ ownerId: req.user.id, boardId }).populate('guestId', 'username email avatar');
    
    const collaborators = sharedBoards.map(sb => ({
      odunerId: sb._id,
      userId: sb.guestId._id,
      username: sb.guestId.username,
      email: sb.guestId.email,
      avatar: sb.guestId.avatar || '',
      joinedAt: sb.joinedAt
    }));

    res.json({ collaborators });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Kick a Collaborator from Board (owner only)
router.post('/kick', authenticateToken, async (req, res) => {
  try {
    const { boardId, userId } = req.body;
    if (!boardId || !userId) return res.status(400).json({ message: 'Board ID and User ID are required' });

    // Verify ownership
    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    const result = await SharedBoard.findOneAndDelete({ ownerId: req.user.id, guestId: userId, boardId });
    if (!result) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    // Push updated board data to the kicked user so they see the change instantly
    const emitToUser = req.app.get('emitToUser');
    if (emitToUser) {
      try {
        const kickedUserData = await buildUserBoardData(userId);
        emitToUser(userId, 'board-updated', { boardData: kickedUserData });
      } catch (e) {
        console.error('Failed to push data to kicked user', e);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Ban a Collaborator from Board (owner only) — kick + ban
router.post('/ban', authenticateToken, async (req, res) => {
  try {
    const { boardId, userId } = req.body;
    if (!boardId || !userId) return res.status(400).json({ message: 'Board ID and User ID are required' });

    // Verify ownership
    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    // Remove from shared board (kick)
    await SharedBoard.findOneAndDelete({ ownerId: req.user.id, guestId: userId, boardId });

    // Add to banned list
    try {
      const ban = new BannedUser({ ownerId: req.user.id, bannedUserId: userId, boardId });
      await ban.save();
    } catch (e) {
      if (e.code !== 11000) throw e; // Ignore duplicate ban
    }

    // Push updated board data to the banned user
    const emitToUser = req.app.get('emitToUser');
    if (emitToUser) {
      try {
        const bannedUserData = await buildUserBoardData(userId);
        emitToUser(userId, 'board-updated', { boardData: bannedUserData });
      } catch (e) {
        console.error('Failed to push data to banned user', e);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});
// Get Banned Users for a Board (owner only)
router.get('/banned/:boardId', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    const bans = await BannedUser.find({ ownerId: req.user.id, boardId }).populate('bannedUserId', 'username email avatar');
    
    const bannedUsers = bans.map(b => ({
      odunerId: b._id,
      userId: b.bannedUserId._id,
      username: b.bannedUserId.username,
      email: b.bannedUserId.email,
      avatar: b.bannedUserId.avatar || '',
      bannedAt: b.bannedAt
    }));

    res.json({ bannedUsers });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Unban a User from Board (owner only)
router.post('/unban', authenticateToken, async (req, res) => {
  try {
    const { boardId, userId } = req.body;
    if (!boardId || !userId) return res.status(400).json({ message: 'Board ID and User ID are required' });

    const boardDoc = await Board.findOne({ userId: req.user.id });
    if (!boardDoc || !boardDoc.data || !boardDoc.data.boards || !boardDoc.data.boards.find(b => b.id === boardId)) {
      return res.status(403).json({ message: 'You do not own this board' });
    }

    const result = await BannedUser.findOneAndDelete({ ownerId: req.user.id, bannedUserId: userId, boardId });
    if (!result) {
      return res.status(404).json({ message: 'Banned user not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

module.exports = router;
