"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

declare global {
  interface Window {
    socket: Socket | null;
  }
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string | number) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
}

interface Notification {
  id: string | number;
  timestamp: Date;
  read: boolean;
  type: string;
  title: string;
  message: string;
  data: unknown;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
  notifications: [],
  addNotification: () => {},
  markNotificationAsRead: () => {},
  markAllNotificationsAsRead: () => {},
  clearAllNotifications: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnecting = useRef(false);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const existingNotification = notifications.find(n => {
      const nData = n.data as { issue?: { id?: string | number }; updatedBy?: string; createdBy?: string };
      const notificationData = notification.data as { issue?: { id?: string | number }; updatedBy?: string; createdBy?: string };
      
      return n.type === notification.type && 
        nData.issue?.id === notificationData.issue?.id &&
        nData.updatedBy === notificationData.updatedBy &&
        nData.createdBy === notificationData.createdBy &&
        n.message === notification.message &&
        Date.now() - n.timestamp.getTime() < 5000 // Within 5 seconds
    });
    
    if (existingNotification) {
      return;
    }

    const newNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID with timestamp + random string
      timestamp: new Date(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep max 50 notifications
  }, [notifications]);

  const markNotificationAsRead = useCallback((notificationId: string | number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }

    if (globalSocket && globalSocket.connected) {
      setSocket(globalSocket);
      setIsConnected(true);
      if (typeof window !== 'undefined') {
        window.socket = globalSocket;
      }
      return;
    }

    if (isConnecting.current) {
      return;
    }

    isConnecting.current = true;

    const connectSocket = () => {
      // ตรวจสอบ environment และเลือก URL ที่เหมาะสม
      let socketUrl: string;
      
      if (typeof window !== 'undefined') {
        // ตรวจสอบว่าเป็น PWD หรือไม่
        const isPWD = window.location.hostname.includes('play-with-docker') || 
                     window.location.hostname.includes('pwd') ||
                     window.location.hostname.includes('labs.play-with-docker');
        
        if (isPWD) {
          // ใช้ relative path สำหรับ PWD
          socketUrl = window.location.origin;
        } else {
          // ใช้ localhost สำหรับ development
          socketUrl = 'http://localhost:3000';
        }
      } else {
        socketUrl = 'http://localhost:3000';
      }
      
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // websocket ก่อน polling
        timeout: 10000,
        path: '/socket.io/',
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        upgrade: true,
        rememberUpgrade: true,
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        isConnecting.current = false;
        globalSocket = newSocket;
        
        if (typeof window !== 'undefined') {
          window.socket = newSocket;
        }
      });

      newSocket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        isConnecting.current = false;
        globalSocket = null;
        
        if (typeof window !== 'undefined') {
          window.socket = null;
        }
        
        if (reason === 'io server disconnect') {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(connectSocket, 2000 * reconnectAttempts.current);
          }
        }
      });

      newSocket.on('connect_error', (error: Error) => {
        setConnectionError(error.message);
        setIsConnected(false);
        isConnecting.current = false;
        globalSocket = null;
        
        if (typeof window !== 'undefined') {
          window.socket = null;
        }
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connectSocket, 2000 * reconnectAttempts.current);
        }
      });

      newSocket.on('connected', () => {
        // User connected event
      });

      // Issue-related events
      newSocket.on('issue_created', (data: unknown) => {
        const issueData = data as { message?: string; issue?: { title?: string } };
        const notificationMessage = issueData.message || `New issue created: ${issueData.issue?.title || 'Untitled'}`;
        addNotification({
          type: 'issue_created',
          title: 'New Issue Created',
          message: notificationMessage,
          data: data
        });
      });

      newSocket.on('issue_updated', (data: unknown) => {
        const issueData = data as { message?: string; issue?: { title?: string; status?: string } };
        const notificationMessage = issueData.message || `Issue updated: ${issueData.issue?.title || 'Untitled'} - Status: ${issueData.issue?.status || 'Unknown'}`;
        addNotification({
          type: 'issue_updated',
          title: 'Issue Updated',
          message: notificationMessage,
          data: data
        });
      });

      // Health check
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping', () => {});
        }
      }, 30000);

      newSocket.on('disconnect', () => {
        clearInterval(pingInterval);
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      isConnecting.current = false;
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      isConnected, 
      connectionError, 
      notifications, 
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearAllNotifications
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
