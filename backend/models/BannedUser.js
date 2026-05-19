const mongoose = require('mongoose');

const BannedUserSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bannedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boardId: {
    type: String,
    required: true
  },
  bannedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user isn't banned twice for the same board
BannedUserSchema.index({ ownerId: 1, bannedUserId: 1, boardId: 1 }, { unique: true });

module.exports = mongoose.model('BannedUser', BannedUserSchema);
