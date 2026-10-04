import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/jwt";
import { DEMO_ROLES, getDemoAccount, isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

// Tells the login page whether to show the one-click demo buttons
export async function GET() {
  const enabled = isDemoMode();
  return NextResponse.json({ enabled, roles: enabled ? DEMO_ROLES : [] });
}

// One-click sign-in as a seeded demo account (only when DEMO_MODE=true)
export async function POST(req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { role } = await req.json();
    const username = typeof role === "string" ? getDemoAccount(role) : undefined;
    if (!username) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Demo account not found" }, { status: 404 });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({ token, user });
  } catch (error) {
    console.error("/api/auth/demo error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
