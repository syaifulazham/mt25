import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuestionAuthorization } from "../auth-utils";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/organizer/questions/knowledge-fields
// Get all unique knowledge fields from the question bank
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuestionAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    // Get unique knowledge fields from the database
    const knowledgeFieldsResult = await prisma.question_bank.findMany({
      distinct: ['knowledge_field'],
      select: {
        knowledge_field: true
      },
      orderBy: {
        knowledge_field: 'asc'
      }
    });
    
    // Extract the field names from the result
    const knowledgeFields = knowledgeFieldsResult
      .map(result => result.knowledge_field)
      .filter(field => field && field.trim() !== ''); // Filter out empty fields
    
    console.log(`[API] Returning ${knowledgeFields.length} knowledge fields`);
    
    return NextResponse.json(knowledgeFields);
  } catch (error) {
    console.error("[API] Error getting knowledge fields:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
