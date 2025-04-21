import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER", "JUDGE", "PARTICIPANTS_MANAGER"]).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id, 10);
    
    // Validate that userId is a valid number
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Users can view their own profile, but only ADMIN and OPERATOR can view other profiles
    if (
      currentUser.id !== userId &&
      !hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(params.id, 10);
    
    // Validate that userId is a valid number
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Users can update their own profile (except role), but only ADMIN can update other profiles or change roles
    const isUpdatingSelf = currentUser.id === userId;
    const isAdmin = currentUser.role === "ADMIN";

    if (!isUpdatingSelf && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Non-admin users cannot change their own role
    if (isUpdatingSelf && !isAdmin && updateData.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    // Check if user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent changing the last admin's role or deactivating them
    if (userToUpdate.role === "ADMIN" && (updateData.role || updateData.isActive === false)) {
      // Count active admins
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot modify the last admin account" },
          { status: 400 }
        );
      }
    }

    // Check if email or username is being changed and if it already exists
    if (updateData.email || updateData.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            updateData.email ? { email: updateData.email } : {},
            updateData.username ? { username: updateData.username } : {},
          ],
          NOT: {
            id: userId,
          },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email or username already in use" },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const finalUpdateData: any = { ...updateData };

    // Hash password if provided
    if (updateData.password) {
      finalUpdateData.password = await hash(updateData.password, 10);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: finalUpdateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete users
    if (!hasRequiredRole(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);
    
    // Validate that userId is a valid number
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists and is an admin
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (userToDelete.role === "ADMIN") {
      // Count active admins
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin account" },
          { status: 400 }
        );
      }
    }

    // Delete user from database
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
