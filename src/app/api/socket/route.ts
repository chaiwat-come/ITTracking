import { NextRequest } from 'next/server';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '@/lib/jwt';

// Extend Socket interface to include custom properties
interface CustomSocket extends Socket {
  userId?: number;
  username?: string;
  role?: string;
  roleRoom?: string;
}

// Extend global type
declare global {
  var io: SocketIOServer | undefined;
  var socketNotifications: {
    notifyUser: (userId: number, event: string, data: unknown) => void;
    notifyRole: (role: string, event: string, data: unknown) => void;
    broadcast: (event: string, data: unknown) => void;
    getConnectedUsers: () => unknown[];
    getConnectedUserCount: () => number;
  } | undefined;
}

// Store connected users
const connectedUsers = new Map();

export async function GET(req: NextRequest) {
  if (!global.io) {
    // initializing socket server

    // Get the underlying HTTP server from Next.js
    const httpServer = (req as unknown as { socket?: { server?: unknown } }).socket?.server;

    if (!httpServer) {
      return new Response('HTTP server not available', { status: 500 });
    }

    const io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // JWT Authentication middleware
    io.use((socket: CustomSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = verifyToken(token);
        if (!decoded) {
          return next(new Error('Authentication error: Invalid token'));
        }

        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;

        // user connected via websocket
        next();
      } catch {
        // auth failed
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket: CustomSocket) => {
      // Store user connection
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        username: socket.username,
        role: socket.role,
        connectedAt: new Date()
      });

      // user connected

      // Join user to their own room for personal notifications
      socket.join(`user_${socket.userId}`);

      // Join role-based room (แค่ room เดียว)
      socket.join(`role_${socket.role}`);

      // Store which role room the user is in to prevent duplicates
      socket.roleRoom = `role_${socket.role}`;

      // Handle disconnect
      socket.on('disconnect', () => {
        connectedUsers.delete(socket.userId);
        // user disconnected
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
      notifyUser: (userId: number, event: string, data: unknown) => {
        io.to(`user_${userId}`).emit(event, data);
      },
      notifyRole: (role: string, event: string, data: unknown) => {
        // ส่งแค่ครั้งเดียวให้ role นั้น
        io.to(`role_${role}`).emit(event, data);
      },
      broadcast: (event: string, data: unknown) => {
        io.emit(event, data);
      },
      getConnectedUsers: () => Array.from(connectedUsers.values()),
      getConnectedUserCount: () => connectedUsers.size
    };

    global.io = io;
    // socket server ready
  }

  return new Response(JSON.stringify({
    status: 'Socket.IO server running',
    connectedUsers: connectedUsers.size,
    path: '/api/socket',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
