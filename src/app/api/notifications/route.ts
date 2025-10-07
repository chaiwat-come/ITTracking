import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";

// Send real-time notification via WebSocket
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and support can send notifications
    if (user.role !== 'admin' && user.role !== 'support') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, targetUserId, targetRole, event, data } = await req.json();

    if (!type || !event || !data) {
      return NextResponse.json(
        { error: "type, event, and data are required" },
        { status: 400 }
      );
    }

    // Check if WebSocket server is available
    if (!global.socketNotifications) {
      return NextResponse.json(
        { error: "WebSocket server not available" },
        { status: 503 }
      );
    }

    let result;
    
    switch (type) {
      case 'user':
        if (!targetUserId) {
          return NextResponse.json({ error: "targetUserId required for user notifications" }, { status: 400 });
        }
        global.socketNotifications.notifyUser(targetUserId, event, data);
        result = `Notification sent to user ${targetUserId}`;
        break;

      case 'role':
        if (!targetRole) {
          return NextResponse.json({ error: "targetRole required for role notifications" }, { status: 400 });
        }
        global.socketNotifications.notifyRole(targetRole, event, data);
        result = `Notification sent to role ${targetRole}`;
        break;

      case 'broadcast':
        global.socketNotifications.broadcast(event, data);
        result = "Notification broadcast to all users";
        break;

      default:
        return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Notification sent successfully",
      result,
      connectedUsers: global.socketNotifications.getConnectedUserCount()
    });

  } catch (error) {
    console.error("/api/notifications POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get WebSocket server status
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!global.socketNotifications) {
      return NextResponse.json({
        status: "unavailable",
        message: "WebSocket server not available"
      });
    }

    return NextResponse.json({
      status: "available",
      connectedUsers: global.socketNotifications.getConnectedUserCount(),
      users: user.role === 'admin' ? global.socketNotifications.getConnectedUsers() : undefined
    });

  } catch (error) {
    console.error("/api/notifications GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
