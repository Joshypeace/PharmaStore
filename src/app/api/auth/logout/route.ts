import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  try {
    // remove session cookie
    const cookie = serialize("session", "", {
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // set expired cookie in response headers
    const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
    response.headers.append("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
