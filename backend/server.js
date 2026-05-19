const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Track connected users: Map<userId, Set<socketId>>
const connectedUsers = new Map();

// Socket.IO authentication & connection
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.user.id;
    socket.userId = userId;
  } catch (err) {
    socket.disconnect();
    return;
  }

  // Track this connection
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId).add(socket.id);
  console.log(`User ${userId} connected (socket: ${socket.id})`);

  socket.on('disconnect', () => {
    const sockets = connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) connectedUsers.delete(userId);
    }
    console.log(`User ${userId} disconnected (socket: ${socket.id})`);
  });
});

// Helper: emit to a specific user (all their sockets)
function emitToUser(userId, event, data) {
  const sockets = connectedUsers.get(userId.toString());
  if (sockets) {
    sockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }
}

// Make helpers accessible to routes
app.set('emitToUser', emitToUser);
app.set('connectedUsers', connectedUsers);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.log('MongoDB Connection Error: ', err));

app.get('/', (req, res) => {
  res.send('Sydex API is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
