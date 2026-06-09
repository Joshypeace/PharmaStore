import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { pharmacyId: true }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 })
    }

    return NextResponse.json({ pharmacyId: user.pharmacyId })
  } catch (error) {
    console.error("Error fetching pharmacy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}