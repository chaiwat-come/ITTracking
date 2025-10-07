import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { sendWebhook } from "@/lib/webhook";

// Update issue (assign, change status)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const issueId = parseInt(resolvedParams.id);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    // Get the current issue
    const currentIssue = await prisma.issue.findUnique({
      where: { id: issueId }
    });

    if (!currentIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Check permissions
    const canUpdate = 
      user.role === 'admin' || 
      (user.role === 'support' && (currentIssue.assignedTo === user.username || currentIssue.assignedTo === null)) ||
      (user.role === 'user' && currentIssue.createdBy === user.username);

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, assignedTo, title, description, category, priority } = await req.json();

    // Validate status transitions
    const validStatuses = ["New", "In Progress", "Resolved"];
    const statusTransitions: { [key: string]: string[] } = {
      "New": ["In Progress", "Resolved"],
      "In Progress": ["Resolved", "New"],
      "Resolved": ["New", "In Progress"]
    };

    const updateData: {
      status?: string;
      assignedTo?: string | null;
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
    } = {};

    if (status && status !== currentIssue.status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      
      // Check if currentIssue.status exists in statusTransitions
      if (currentIssue.status && statusTransitions[currentIssue.status] && !statusTransitions[currentIssue.status].includes(status)) {
        return NextResponse.json({ 
          error: `Cannot change status from ${currentIssue.status} to ${status}` 
        }, { status: 400 });
      }
      updateData.status = status;
    }

    // Only admin and support can assign issues
    if (assignedTo !== undefined && (user.role === 'admin' || user.role === 'support')) {
      if (assignedTo === null || assignedTo === '') {
        updateData.assignedTo = null;
      } else {
        // Verify assignee exists and has appropriate role
        const assignee = await prisma.user.findUnique({
          where: { username: assignedTo },
          select: { username: true, role: true }
        });

        if (!assignee) {
          return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
        }

        if (assignee.role !== 'support' && assignee.role !== 'admin') {
          return NextResponse.json({ error: "Can only assign to support or admin users" }, { status: 400 });
        }

        updateData.assignedTo = assignedTo;
      }
    }

    // Users can update their own issue details
    if (user.role === 'user' && currentIssue.createdBy === user.username) {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (priority && ["Low", "Medium", "High", "Critical"].includes(priority)) {
        updateData.priority = priority;
      }
    }

    // Admin and support can update any field
    if (user.role === 'admin' || user.role === 'support') {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (category) updateData.category = category;
      if (priority && ["Low", "Medium", "High", "Critical"].includes(priority)) {
        updateData.priority = priority;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: updateData
    });

    // Send webhook notification if status changed
    if (status && status !== currentIssue.status) {
      await sendWebhook({
        event: "issue.updated",
        issue_id: updatedIssue.id,
        new_status: updatedIssue.status || "Unknown",
        updated_by: user.username,
      });
    }

    // Send real-time notifications - ส่งเฉพาะเมื่อ status เปลี่ยน และส่งให้ creator เท่านั้น
    if (status && status !== currentIssue.status && global.socketNotifications) {
      const notificationData = {
        issue: updatedIssue,
        updatedBy: user.username,
        changes: updateData
      };

      // ส่งให้เจ้าของ issue (creator) - ถ้าไม่ใช่คนที่อัปเดตเอง
      if (updatedIssue.createdBy && updatedIssue.createdBy !== user.username) {
        const creatorUser = await prisma.user.findUnique({
          where: { username: updatedIssue.createdBy },
          select: { id: true, username: true }
        });
        
        if (creatorUser) {
          global.socketNotifications.notifyUser(creatorUser.id, 'issue_updated', {
            ...notificationData,
            message: `Your issue "${updatedIssue.title}" status changed to ${status} by ${user.username}`
          });
        }
      }
    }

    return NextResponse.json({
      message: "Issue updated successfully",
      issue: updatedIssue
    });
  } catch (error) {
    console.error("/api/issues/[id] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get single issue
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const issueId = parseInt(resolvedParams.id);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId }
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Check permissions
    const canView = 
      user.role === 'admin' || 
      issue.createdBy === user.username ||
      (user.role === 'support' && (issue.assignedTo === user.username || issue.assignedTo === null));

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error("/api/issues/[id] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
