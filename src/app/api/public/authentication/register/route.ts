// app/api/public/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { name, phoneNumber, email, password } = await request.json()

    // Validate
    if (!name || !phoneNumber || !password) {
      return NextResponse.json(
        { error: "Name, phone number, and password are required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.publicUser.findFirst({
      where: {
        OR: [
          { phoneNumber: phoneNumber },
          ...(email ? [{ email: email }] : [])
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this phone number or email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.publicUser.create({
      data: {
        name,
        phoneNumber,
        email: email || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        createdAt: true,
      }
    })

    // Create session token (you can use JWT or your preferred method)
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      success: true,
      user,
      sessionToken,
      message: "Account created successfully"
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}