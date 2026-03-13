import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // TODO: Implement actual authentication logic
    const response = NextResponse.json({
      message: "Login successful",
      user: { email },
    });
    response.cookies.set("auth-token", "demo-session", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
