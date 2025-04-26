import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Create a POST handler for the login API
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // First check regular users
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (user) {
      // Check if the user is active
      if (!user.isActive) {
        return NextResponse.json(
          { error: "User account is inactive" },
          { status: 403 }
        );
      }

      // Verify password
      const passwordValid = await compare(password, user.password || '');
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Create JWT token
      const token = sign(
        {
          id: String(user.id),
          email: user.email,
          role: user.role,
          isParticipant: false,
        },
        process.env.NEXTAUTH_SECRET || "fallback-secret",
        { expiresIn: "8h" }
      );

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Set cookies
      cookies().set({
        name: "next-auth.session-token",
        value: token,
        httpOnly: true,
        path: "/",
        maxAge: 8 * 60 * 60, // 8 hours
        sameSite: "lax",
      });

      // Return success response
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    }

    // Check for participant users
    const participant = await prisma.user_participant.findUnique({
      where: { username }
    });

    if (participant) {
      // Check if the participant is active
      if (!participant.isActive) {
        return NextResponse.json(
          { error: "User account is inactive" },
          { status: 403 }
        );
      }

      // Verify password
      if (!participant.password) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const passwordValid = await compare(password, participant.password);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Create JWT token
      const token = sign(
        {
          id: String(participant.id),
          email: participant.email,
          isParticipant: true,
        },
        process.env.NEXTAUTH_SECRET || "fallback-secret",
        { expiresIn: "8h" }
      );

      // Update last login time
      await prisma.user_participant.update({
        where: { id: participant.id },
        data: { lastLogin: new Date() }
      });

      // Set cookies
      cookies().set({
        name: "next-auth.session-token",
        value: token,
        httpOnly: true,
        path: "/",
        maxAge: 8 * 60 * 60, // 8 hours
        sameSite: "lax",
      });

      // Return success response
      return NextResponse.json({
        success: true,
        user: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          isParticipant: true,
        }
      });
    }

    // If no user found
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
