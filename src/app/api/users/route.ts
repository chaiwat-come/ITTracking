import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import bcrypt from "bcryptjs";

// Get users (for assignment purposes)
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and support can view users
    if (user.role !== 'admin' && user.role !== 'support') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const whereClause: {
      role?: string | { in: string[] };
    } = {};
    
    // Filter by role if specified
    if (role && ['admin', 'support', 'user'].includes(role)) {
      whereClause.role = role;
    }

    // Support users can only see admin and support users (for assignment)
    if (user.role === 'support') {
      whereClause.role = { in: ['admin', 'support'] };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        role: true,
      },
      orderBy: {
        username: 'asc'
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("/api/users GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create new user (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = ["admin", "support", "user"].includes(role) ? role : "user";

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
