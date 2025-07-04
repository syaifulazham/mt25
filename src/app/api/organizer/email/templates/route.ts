import { NextResponse } from "next/server";
import { authenticateOrganizerApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/organizer/email/templates - Get all email templates
export async function GET() {
  try {
    // Use the standard app authentication pattern
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    
    if (!auth.success) {
      return new NextResponse(
        JSON.stringify({ error: auth.message || 'Unauthorized' }), 
        { status: auth.status || 401 }
      );
    }
    
    // User is authenticated with proper role
    const user = auth.user;

    // Get all templates
    const templates = await prisma.email_template.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

// POST /api/organizer/email/templates - Create a new email template
export async function POST(req: Request) {
  try {
    // Use the standard app authentication pattern
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    
    if (!auth.success) {
      return new NextResponse(
        JSON.stringify({ error: auth.message || 'Unauthorized' }), 
        { status: auth.status || 401 }
      );
    }
    
    // User is authenticated with proper role
    const user = auth.user;

    // Parse request body
    const body = await req.json();
    const {
      template_name,
      title,
      subject,
      content,
      notes,
      delivery_type,
      scheduled_datetime,
      category,
      available_placeholders,
    } = body;

    // Validate required fields
    if (!template_name || !title || !subject || !content) {
      return new NextResponse(
        JSON.stringify({
          error: "Missing required fields: template_name, title, subject, content",
        }),
        { status: 400 }
      );
    }

    // Create new template
    const template = await prisma.email_template.create({
      data: {
        template_name,
        title,
        subject,
        content,
        notes: notes || null,
        delivery_type: delivery_type || "MANUAL",
        scheduled_datetime: scheduled_datetime ? new Date(scheduled_datetime) : null,
        created_by: parseInt(user.id) || null,
        category: category || null,
        available_placeholders: available_placeholders || null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating email template:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
