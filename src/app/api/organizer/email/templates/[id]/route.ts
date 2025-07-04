import { NextResponse } from "next/server";
import { authenticateOrganizerApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/organizer/email/templates/[id] - Get a single email template
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Use the standard app authentication pattern
    const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    
    if (!auth.success) {
      return new NextResponse(
        JSON.stringify({ error: auth.message || 'Unauthorized' }), 
        { status: auth.status || 401 }
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return new NextResponse(JSON.stringify({ error: "Invalid ID" }), {
        status: 400,
      });
    }

    // Get template by ID
    const template = await prisma.email_template.findUnique({
      where: { id },
    });

    if (!template) {
      return new NextResponse(JSON.stringify({ error: "Template not found" }), {
        status: 404,
      });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching email template:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
