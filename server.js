const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { loadEnvConfig } = require('@next/env');

const dev = process.env.NODE_ENV !== 'production';
// โหลด .env แบบเดียวกับ Next.js ก่อนอ่านค่า env ใด ๆ (ใน Docker ค่ามาจาก docker-compose อยู่แล้ว)
loadEnvConfig(process.cwd(), dev);
const hostname = process.env.HOSTNAME || '0.0.0.0';  // เปลี่ยนเป็น 0.0.0.0 สำหรับ Docker
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ใช้ JWT_SECRET จาก environment variable เท่านั้น - ห้าม fallback เป็นค่าที่ hardcode ไว้
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set (run scripts/init-env.sh or copy env.example to .env)');
  process.exit(1);
}

// Store connected users
const connectedUsers = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: [`http://localhost:${port}`, `http://${hostname}:${port}`],  // เพิ่ม hostname
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // JWT Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.role = decoded.role;
      
      console.log(`User ${decoded.username} (${decoded.role}) connected via WebSocket`);
      next();
    } catch (err) {
      console.error('WebSocket authentication failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      role: socket.role,
      connectedAt: new Date()
    });

    console.log(`User ${socket.username} connected. Total connected: ${connectedUsers.size}`);

    // Join user to their own room for personal notifications
    socket.join(`user_${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role_${socket.role}`);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.username} disconnected: ${reason}. Total connected: ${connectedUsers.size}`);
    });

    // Handle ping for connection health check
    socket.on('ping', (callback) => {
      callback({ status: 'pong', timestamp: Date.now() });
    });

    // Send initial connection success
    socket.emit('connected', {
      message: 'Successfully connected to real-time notifications',
      user: {
        id: socket.userId,
        username: socket.username,
        role: socket.role
      }
    });
  });

  // Expose notification functions globally
  global.socketNotifications = {
    notifyUser: (userId, event, data) => {
      io.to(`user_${userId}`).emit(event, data);
    },
    notifyRole: (role, event, data) => {
      io.to(`role_${role}`).emit(event, data);
    },
    broadcast: (event, data) => {
      io.emit(event, data);
    },
    getConnectedUsers: () => Array.from(connectedUsers.values()),
    getConnectedUserCount: () => connectedUsers.size
  };

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {  // เพิ่ม hostname parameter
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket server integrated on port ${port}`);
      console.log(`> Environment: ${process.env.NODE_ENV}`);
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
