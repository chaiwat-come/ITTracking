import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { sendWebhook } from "@/lib/webhook";

interface IssueData {
  title: string;
  description: string;
  category?: string;
  priority?: string;
}

interface WhereClause {
  createdBy?: string;
  OR?: Array<{ assignedTo: string | null } | { title: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>;
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}

// Create new issue
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, category, priority }: IssueData = await req.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: "title and description are required" },
        { status: 400 }
      );
    }

    const validPriorities = ["Low", "Medium", "High", "Critical"];
    const issuePriority = validPriorities.includes(priority || "") ? (priority || "Medium") : "Medium";

    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        category: category || null,
        priority: issuePriority as string,
        status: "New",
        createdBy: user.username,
      }
    });

    // Send webhook notification
    await sendWebhook({
      event: "issue.created",
      issue_id: issue.id,
      new_status: issue.status || "Unknown",
      updated_by: user.username,
    });

    // Send real-time notifications - ส่งเฉพาะ admin และ support
    if ((global as unknown as { socketNotifications?: unknown }).socketNotifications) {
      // ส่งให้ admin และ support เท่านั้น (ไม่ส่งให้ user ที่สร้าง)
      (global as unknown as { socketNotifications?: { notifyRole: (role: string, event: string, data: unknown) => void } }).socketNotifications?.notifyRole('admin', 'issue_created', {
        issue,
        createdBy: user.username,
        message: `New issue "${issue.title as string}" created by ${user.username}`
      });
      
      (global as unknown as { socketNotifications?: { notifyRole: (role: string, event: string, data: unknown) => void } }).socketNotifications?.notifyRole('support', 'issue_created', {
        issue,
        createdBy: user.username,
        message: `New issue "${issue.title as string}" created by ${user.username}`
      });
    }

    return NextResponse.json(
      { message: "Issue created successfully", issue },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/issues/create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get issues (with filtering and role-based access)
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');

    const whereClause: WhereClause = {};

    // Role-based filtering
    if (user.role === 'user') {
      // Regular users only see their own issues
      whereClause.createdBy = user.username;
    } else if (user.role === 'support') {
      // Support users see issues assigned to them or unassigned issues
      whereClause.OR = [
        { assignedTo: user.username },
        { assignedTo: null }
      ];
    }
    // Admin sees all issues (no additional filtering)

    // Apply filters
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    if (assignedTo) whereClause.assignedTo = assignedTo;

    // Search functionality
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const issues = await prisma.issue.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("/api/issues/get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
