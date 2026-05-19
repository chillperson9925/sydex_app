const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boardId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 minutes (600 seconds)
  }
});

module.exports = mongoose.model('Invite', InviteSchema);
