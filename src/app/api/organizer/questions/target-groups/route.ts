import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuestionAuthorization } from "../auth-utils";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/organizer/questions/target-groups
// Get all unique target groups from the question bank
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuestionAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    // Get unique target groups from the database
    const targetGroupsResult = await prisma.question_bank.findMany({
      distinct: ['target_group'],
      select: {
        target_group: true
      },
      orderBy: {
        target_group: 'asc'
      }
    });
    
    // Extract the group names from the result
    const targetGroups = targetGroupsResult
      .map(result => result.target_group)
      .filter(group => group && group.trim() !== ''); // Filter out empty groups
    
    console.log(`[API] Returning ${targetGroups.length} target groups`);
    
    return NextResponse.json(targetGroups);
  } catch (error) {
    console.error("[API] Error getting target groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
