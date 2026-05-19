const mongoose = require('mongoose');

const SharedBoardSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boardId: {
    type: String,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user doesn't join the same board multiple times
SharedBoardSchema.index({ guestId: 1, boardId: 1 }, { unique: true });

module.exports = mongoose.model('SharedBoard', SharedBoardSchema);
