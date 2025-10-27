import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";
import nodemailer from "nodemailer";

interface EmailTestRequest {
  to: string;
  subject: string;
  message: string;
}

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has organizer role
    const userRole = (session.user as any).role;
    if (!userRole || !["ADMIN", "OPERATOR"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admins and operators can send test emails." },
        { status: 403 }
      );
    }

    // Parse request body
    const body: EmailTestRequest = await request.json();
    const { to, subject, message } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Debug all environment variables in POST route
    console.log('POST ROUTE - ALL ENV VARIABLES:', Object.keys(process.env));
    
    // Debug specific SMTP variables
    console.log('POST ROUTE - SMTP ENV DEBUG:', {
      SMTP_SERVICE: process.env.SMTP_SERVICE,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
    });
    
    // Get SMTP configuration from environment variables
    const smtpConfig = {
      service: process.env.SMTP_SERVICE,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };

    // Validate SMTP configuration
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      return NextResponse.json(
        { 
          error: "SMTP configuration incomplete", 
          details: "EMAIL_USER and EMAIL_PASS environment variables are required" 
        },
        { status: 500 }
      );
    }

    // Create transporter based on available configuration
    let transporterConfig: any = {
      auth: smtpConfig.auth,
    };

    if (smtpConfig.service) {
      // Use service-based configuration (Gmail, Outlook, etc.)
      transporterConfig.service = smtpConfig.service;
    } else if (smtpConfig.host) {
      // Use custom SMTP host configuration
      transporterConfig.host = smtpConfig.host;
      if (smtpConfig.port) {
        transporterConfig.port = smtpConfig.port;
      }
      if (typeof smtpConfig.secure === 'boolean') {
        transporterConfig.secure = smtpConfig.secure;
      }
    } else {
      return NextResponse.json(
        { 
          error: "SMTP configuration incomplete", 
          details: "Either SMTP_SERVICE or SMTP_HOST must be configured" 
        },
        { status: 500 }
      );
    }

    console.log("Creating email transporter with config:", {
      ...transporterConfig,
      auth: { user: transporterConfig.auth.user, pass: "[REDACTED]" }
    });

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection configuration
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError);
      return NextResponse.json(
        { 
          error: "SMTP connection failed", 
          details: verifyError instanceof Error ? verifyError.message : "Unknown verification error" 
        },
        { status: 500 }
      );
    }

    // Prepare email content
    const emailContent = {
      from: {
        name: "Techlympics 2025",
        address: smtpConfig.auth.user,
      },
      to: to,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Techlympics 2025</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Email Test</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">${subject}</h2>
              <div style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This email was sent from the Techlympics 2025 Organizer Portal</p>
            <p>Sent by: ${session.user.name || session.user.email} (${userRole})</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };

    // Send email
    console.log("Sending test email to:", to);
    const emailResult = await transporter.sendMail(emailContent);
    console.log("Email sent successfully:", emailResult.messageId);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully!",
      details: {
        messageId: emailResult.messageId,
        recipient: to,
        subject: subject,
        sentAt: new Date().toISOString(),
        sentBy: session.user.name || session.user.email,
      },
    });

  } catch (error) {
    console.error("Error sending test email:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to send test email", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check SMTP configuration status
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has organizer role
    const userRole = (session.user as any).role;
    if (!userRole || !["ADMIN", "OPERATOR"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Debug all environment variables
    console.log('ALL ENV VARIABLES:', Object.keys(process.env));
    
    // Debug specific SMTP variables
    console.log('SMTP ENV DEBUG:', {
      SMTP_SERVICE: process.env.SMTP_SERVICE,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
    });
    
    // Check SMTP configuration
    const config = {
      service: process.env.SMTP_SERVICE || null,
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT || null,
      secure: process.env.SMTP_SECURE || null,
      emailUser: process.env.EMAIL_USER ? "[CONFIGURED]" : null,
      emailPass: process.env.EMAIL_PASS ? "[CONFIGURED]" : null,
    };

    const isConfigured = (config.service || config.host) && config.emailUser && config.emailPass;

    return NextResponse.json({
      configured: isConfigured,
      config: config,
      status: isConfigured ? "Ready" : "Incomplete configuration",
    });

  } catch (error) {
    console.error("Error checking SMTP configuration:", error);
    return NextResponse.json(
      { error: "Failed to check configuration" },
      { status: 500 }
    );
  }
}
