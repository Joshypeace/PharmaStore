import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma, Role, PermissionModule } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Define types for permissions
interface PermissionAccess {
  view: boolean
  edit: boolean
  delete: boolean
}

// interface Permissions {
//   [module: string]: PermissionAccess
// }

// GET all users with filtering
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('search') || ''
  const role = searchParams.get('role') || 'all'

  try {
    const whereClause: Prisma.UserWhereInput = {}

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    if (role !== 'all') {
      // Validate and cast the role to the Role enum
      const validRoles = Object.values(Role)
      if (validRoles.includes(role as Role)) {
        whereClause.role = role as Role
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        permissions: {
          select: {
            module: true,
            canView: true,
            canEdit: true,
            canDelete: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform permissions to match frontend format
    const transformedUsers = users.map((user: { id: string; name: string; email: string; role: Role; status: string; lastLogin: Date | null; createdAt: Date; permissions: { module: PermissionModule; canView: boolean; canEdit: boolean; canDelete: boolean }[] }) => ({
      ...user,
      permissions: user.permissions
        .filter(p => p.canView || p.canEdit || p.canDelete)
        .map(p => p.module.toLowerCase())
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email, password, role, permissions } = body

    // Validate role
    const validRoles = Object.values(Role)
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role provided' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with permissions
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
        permissions: {
          create: Object.entries(permissions).map(([module, access]) => {
            const permissionAccess = access as PermissionAccess

            const normalizedModule = module.toUpperCase() as keyof typeof PermissionModule
            const moduleEnum = PermissionModule[normalizedModule]
            return {
              module: moduleEnum,
              canView: permissionAccess.view || false,
              canEdit: permissionAccess.edit || false,
              canDelete: permissionAccess.delete || false,
            }
          }),
        },
      },
      include: {
        permissions: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'ADD_STOCK',
        message: `Created new user account for ${name}`,
        userId: session.user.id,
      },
    })

    // Remove password from response
    const { password: removedPassword, ...userWithoutPassword } = newUser

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PATCH update user permissions
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, permissions, status, role } = body

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {}

    if (status) {
      updateData.status = status
    }

    if (role) {
      // Validate role
      const validRoles = Object.values(Role)
      if (validRoles.includes(role)) {
        updateData.role = role as Role
      }
    }

    // Update user if there's data to update
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      })
    }

    // Update permissions if provided
    if (permissions) {
      // Delete existing permissions
      await prisma.userPermission.deleteMany({
        where: { userId },
      })

      // Create new permissions
      await prisma.userPermission.createMany({
        data: Object.entries(permissions).map(([module, access]) => {
          const permissionAccess = access as PermissionAccess

            const normalizedModule = module.toUpperCase() as keyof typeof PermissionModule
            const moduleEnum = PermissionModule[normalizedModule]
          return {
            module: moduleEnum,
            canView: permissionAccess.view || false,
            canEdit: permissionAccess.edit || false,
            canDelete: permissionAccess.delete || false,
            userId,
          }
        }),
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'UPDATE_STOCK',
        message: `Updated permissions for user ${userId}`,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user permissions first
    await prisma.userPermission.deleteMany({
      where: { userId },
    })

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'DELETE_STOCK',
        message: `Deleted user account ${userId}`,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}