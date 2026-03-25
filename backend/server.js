const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io for real-time features (bus tracking, SOS alerts)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/bus', require('./routes/bus'));
app.use('/api/ocr', require('./routes/ocr'));
app.use('/api/messages', require('./routes/messages'));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Socket.io real-time events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // SOS alert — broadcast to all admins/responders
  socket.on('sos-alert', (data) => {
    console.log('SOS received:', data);
    socket.broadcast.emit('sos-received', {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // Bus location update (simulated driver sending location)
  socket.on('bus-update', (data) => {
    io.emit('bus-location', data);
  });

  // Real-time message
  socket.on('send-message', (data) => {
    io.emit('receive-message', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 Make sure MongoDB is running: mongod');
  });

module.exports = { io };
