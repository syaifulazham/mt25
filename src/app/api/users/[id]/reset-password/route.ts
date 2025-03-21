import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import { randomBytes } from "crypto";
import { hash } from "bcrypt";

// POST /api/users/[id]/reset-password - Reset a user's password
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and OPERATOR can reset passwords
    if (!hasRequiredRole(currentUser, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(params.id, 10);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Cannot reset password for inactive user" },
        { status: 400 }
      );
    }

    // In a real application, we would:
    // 1. Generate a password reset token
    // 2. Store it in the database with an expiration
    // 3. Send an email to the user with a link to reset their password
    
    // For demonstration purposes, we'll generate a temporary random password
    const temporaryPassword = randomBytes(8).toString("hex");
    const hashedPassword = await hash(temporaryPassword, 10);
    
    // Update the user's password in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        // In a real application, we would also set a passwordResetRequired flag
      },
    });

    // In a real application, we would send an email here
    // For now, we'll just return the temporary password in the response
    // NOTE: In production, NEVER return the password in the response
    return NextResponse.json({
      success: true,
      message: "Password reset successful",
      // This is for demonstration only - NEVER do this in production
      temporaryPassword: temporaryPassword,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
