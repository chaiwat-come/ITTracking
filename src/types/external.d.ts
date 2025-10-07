declare global {
  var socketNotifications: {
    notifyUser: (userId: number, event: string, data: unknown) => void;
    notifyRole: (role: string, event: string, data: unknown) => void;
    broadcast: (event: string, data: unknown) => void;
    getConnectedUsers: () => Array<{
      socketId: string;
      username: string;
      role: string;
      connectedAt: Date;
    }>;
    getConnectedUserCount: () => number;
  };
}

export {};


