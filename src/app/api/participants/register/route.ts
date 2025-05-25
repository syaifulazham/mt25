import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'Gmail',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Debug email configuration
console.log('Email configuration:', {
  service: process.env.SMTP_SERVICE,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.EMAIL_USER?.substring(0, 3) + '...',
});

/**
 * Send verification email to a user
 */
async function sendVerificationEmail(
  email: string,
  name: string,
  userId: number
): Promise<void> {
  // Create a verification token using the user's ID and a timestamp
  const timestamp = Date.now();
  const verificationData = `${userId}:${timestamp}`;
  const token = Buffer.from(verificationData).toString('base64');
  
  // Get the base URL and correct verification path
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/auth/participants/verify-email?token=${token}`;

  console.log(`Preparing to send verification email to ${email} with URL: ${verificationUrl}`);

  const fromEmail = process.env.EMAIL_USER || 'noreply@techlympics.com';
  
  const mailOptions = {
    from: `"Techlympics 2025" <${fromEmail}>`,
    to: email,
    subject: 'Verify your Techlympics account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Verify Your Techlympics Account</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering for Techlympics 2025. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If you didn't create this account, you can safely ignore this email.</p>
        <p>The verification link will expire in 24 hours.</p>
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Techlympics 2025</p>
      </div>
    `,
    text: `Hello ${name},\n\nThank you for registering for Techlympics 2025. Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\nThe verification link will expire in 24 hours.\n\nTechlympics 2025`,
  };

  try {
    console.log('Attempting to send email with configuration:', { 
      to: email,
      from: fromEmail,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}. Message ID: ${info.messageId}`);
    return;
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      username, 
      password, 
      ic, 
      phoneNumber, 
      gender, 
      requireEmailVerification = false 
    } = body;
    
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
    // If email verification is required, set isActive to false
    const participant = await prisma.user_participant.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        ic: ic || null,
        phoneNumber: phoneNumber || null,
        gender: gender || null,
        isActive: !requireEmailVerification, // Only set active if email verification not required
        updatedAt: new Date()
      }
    });
    
    // Send verification email if required
    if (requireEmailVerification) {
      try {
        await sendVerificationEmail(email, name, participant.id);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email sending fails, but log the error
      }
    }
    
    // Remove password from response
    const { password: _, ...participantWithoutPassword } = participant;
    
    return NextResponse.json(
      { 
        message: requireEmailVerification 
          ? 'Registration successful. Please check your email to verify your account.' 
          : 'Registration successful', 
        user: participantWithoutPassword,
        requiresVerification: requireEmailVerification
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
