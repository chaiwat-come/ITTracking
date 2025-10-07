import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "username and password required" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({ error: "username exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRole = ["admin", "support", "user"].includes(role) ? role : "user";

    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json(
      { 
        message: "User created successfully", 
        user,
        token 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/auth/register error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


