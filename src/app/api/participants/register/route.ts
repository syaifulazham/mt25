import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, username, password, ic, phoneNumber, gender } = body;
    
    // Validate required fields
    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields. Name, email, username, and password are required.' },
        { status: 400 }
      );
    }
    
    // Check if user with this email or username already exists
    const existingUserByEmail = await prisma.user_participant.findUnique({
      where: { email }
    });
    
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 400 }
      );
    }
    
    const existingUserByUsername = await prisma.user_participant.findUnique({
      where: { username }
    });
    
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'This username is already taken.' },
        { status: 400 }
      );
    }
    
    // Check if IC is already used (if provided)
    if (ic) {
      const existingUserByIC = await prisma.user_participant.findFirst({
        where: { ic }
      });
      
      if (existingUserByIC) {
        return NextResponse.json(
          { error: 'A user with this IC number already exists.' },
          { status: 400 }
        );
      }
    }
    
    // Hash the password
    const hashedPassword = await hash(password, 10);
    
    // Create the participant user
    const participant = await prisma.user_participant.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        ic: ic || null,
        phoneNumber: phoneNumber || null,
        gender: gender || null,
        isActive: true,
        updatedAt: new Date()
      }
    });
    
    // Remove password from response
    const { password: _, ...participantWithoutPassword } = participant;
    
    return NextResponse.json(
      { 
        message: 'Registration successful', 
        user: participantWithoutPassword 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering participant:', error);
    return NextResponse.json(
      { error: 'Failed to register participant' },
      { status: 500 }
    );
  }
}
