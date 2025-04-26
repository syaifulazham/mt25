import { NextResponse } from "next/server";
import { PrismaClient, user_role } from '@prisma/client';
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

// This route will create an initial admin user if none exists
export async function POST(request: Request) {
  try {
    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: {
        role: user_role.ADMIN,
      },
    });

    // If admin users already exist, return a message
    if (adminCount > 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Admin user already exists",
        adminCount
      });
    }

    // Get admin credentials from request body or use defaults
    let adminCredentials;
    try {
      adminCredentials = await request.json();
    } catch (error) {
      // If no body provided, use default values
      adminCredentials = {
        name: 'System Administrator',
        email: 'admin@techlympics.my',
        username: 'admin',
        password: 'admin123'
      };
    }

    // Validate required fields
    if (!adminCredentials.name || !adminCredentials.email || 
        !adminCredentials.username || !adminCredentials.password) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Missing required fields for admin user creation" 
        },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(adminCredentials.password);
    
    // Create the admin user
    const newAdmin = await prisma.user.create({
      data: {
        name: adminCredentials.name,
        email: adminCredentials.email,
        username: adminCredentials.username,
        password: hashedPassword,
        role: user_role.ADMIN,
        isActive: true,
        updatedAt: new Date(), // Add required updatedAt field
      },
    });
    
    // Return success response (omitting password)
    return NextResponse.json({ 
      success: true, 
      message: "Admin user created successfully",
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        username: newAdmin.username,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create admin user", 
        error: String(error) 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
