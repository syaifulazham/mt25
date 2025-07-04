import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/organizer/email/outgoing - Get all outgoing emails
export async function GET(request: Request) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has organizer role
    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "OPERATOR") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Get URL parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    if (templateId) {
      where.template_id = parseInt(templateId);
    }
    
    if (status) {
      where.delivery_status = status;
    }

    // Count total emails matching the filter
    const totalEmails = await prisma.email_outgoing.count({
      where,
    });

    // Get emails with pagination
    const emails = await prisma.email_outgoing.findMany({
      where,
      include: {
        template: {
          select: {
            template_name: true,
            category: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      emails,
      pagination: {
        total: totalEmails,
        page,
        limit,
        totalPages: Math.ceil(totalEmails / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching outgoing emails:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

// POST /api/organizer/email/outgoing - Send a new email using a template
export async function POST(request: Request) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has organizer role
    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "OPERATOR") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // Parse request body
    const body = await request.json();
    const { template_id, recipient_email, subject, content, scheduled_datetime } = body;

    // Validate required fields
    if (!recipient_email || !subject || !content) {
      return new NextResponse(
        JSON.stringify({
          error: "Missing required fields: recipient_email, subject, content",
        }),
        { status: 400 }
      );
    }

    // If template_id is provided, check if it exists
    if (template_id) {
      const template = await prisma.email_template.findUnique({
        where: { id: template_id },
      });

      if (!template) {
        return new NextResponse(
          JSON.stringify({ error: "Template not found" }),
          { status: 404 }
        );
      }
    }

    // Check SMTP configuration
    const smtpConfig = {
      service: process.env.SMTP_SERVICE,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      emailUser: process.env.EMAIL_USER,
      emailPass: process.env.EMAIL_PASS,
    };

    // Check if SMTP is configured
    if (!smtpConfig.host || !smtpConfig.emailUser || !smtpConfig.emailPass) {
      return new NextResponse(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 400 }
      );
    }

    // Determine if this is a scheduled email
    const isScheduled = !!scheduled_datetime;
    const deliveryStatus = isScheduled ? "SCHEDULED" : "PENDING";

    // Create outgoing email record
    const email = await prisma.email_outgoing.create({
      data: {
        template_id: template_id || null,
        recipient_email,
        subject,
        content,
        delivery_status: deliveryStatus,
        sent_at: isScheduled ? null : new Date(),
      },
    });

    // If not scheduled, send email immediately (in a real app, this would typically be handled by a background job)
    if (!isScheduled) {
      try {
        // Use the same nodemailer logic from the test email endpoint
        const nodemailer = require("nodemailer");
        
        // Create transporter
        const transporter = nodemailer.createTransport({
          service: smtpConfig.service,
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.emailUser,
            pass: smtpConfig.emailPass,
          },
        });

        // Send email
        await transporter.sendMail({
          from: smtpConfig.emailUser,
          to: recipient_email,
          subject: subject,
          html: content,
        });

        // Update email status
        await prisma.email_outgoing.update({
          where: { id: email.id },
          data: {
            delivery_status: "SENT",
            is_delivered: true,
          },
        });

        return NextResponse.json({
          ...email,
          delivery_status: "SENT",
          is_delivered: true,
        });
      } catch (error) {
        console.error("Error sending email:", error);

        // Update email status to FAILED
        await prisma.email_outgoing.update({
          where: { id: email.id },
          data: {
            delivery_status: "FAILED",
            error_message: error instanceof Error ? error.message : String(error),
          },
        });

        return NextResponse.json(
          {
            ...email,
            delivery_status: "FAILED",
            error_message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Return scheduled email
    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    console.error("Error creating outgoing email:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
