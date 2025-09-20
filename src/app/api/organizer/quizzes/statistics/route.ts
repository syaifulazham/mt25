import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth-options";

// GET /api/organizer/quizzes/statistics
// Get real statistics for quizzes based on actual database data
export async function GET(request: NextRequest) {
  try {
    // Authorization check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role
    const userRoles = session.user.role ? [session.user.role] : [];
    if (!userRoles.some(role => ["ADMIN", "OPERATOR"].includes(role))) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get all quizzes with their target groups
    const quizzes = await prisma.quiz.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get all target groups for reference
    const targetGroups = await prisma.targetgroup.findMany();
    
    console.log(`Found ${targetGroups.length} target groups:`);
    console.log("Available targetgroup codes:");
    targetGroups.forEach(tg => {
      console.log(`- Code: '${tg.code}', SchoolLevel: '${tg.schoolLevel}', Age: ${tg.minAge}-${tg.maxAge}`);
    });
    
    // Create a mapping from targetGroup code to age range
    const targetGroupAgeMap = new Map();
    targetGroups.forEach(tg => {
      targetGroupAgeMap.set(tg.code, {
        minAge: tg.minAge,
        maxAge: tg.maxAge,
        schoolLevel: tg.schoolLevel,
        code: tg.code // Store the code for reference
      });
    });
    
    console.log("Target group map created with the following keys:");
    console.log(Array.from(targetGroupAgeMap.keys()));

    // Initialize array to hold the statistics results
    const quizStatistics = [];

    // Process each quiz to get statistics
    for (const quiz of quizzes) {
      let eligibleCount = 0;
      let answeredCount = 0;
      
      // Get target group age range from the mapping
      // Default to a wide range if not found
      let minAge = 0;
      let maxAge = 100;
      
      // Log the quiz target group for debugging
      console.log(`\n[Quiz] ID ${quiz.id}: '${quiz.quiz_name}', target_group: '${quiz.target_group}'`);
      
      // Focus on exact matching between quiz.target_group and targetgroup.code
      let matched = false;
      
      // Enhanced logging for troubleshooting
      console.log(`Looking for match for quiz.target_group '${quiz.target_group}' (type: ${typeof quiz.target_group})`);
      console.log(`Target group value length: ${quiz.target_group ? quiz.target_group.length : 'N/A'}, char codes: ${[...(quiz.target_group || '')].map(c => c.charCodeAt(0)).join(', ')}`);
      
      // Get the exact match
      const directMatch = targetGroupAgeMap.get(quiz.target_group);
      
      // Log all keys for comparison
      const mapKeys = Array.from(targetGroupAgeMap.keys());
      console.log(`Map keys (${mapKeys.length}): ${mapKeys.join(', ')}`);
      mapKeys.forEach(key => {
        console.log(`Key '${key}' (type: ${typeof key}, length: ${key.length}, char codes: ${[...key].map(c => c.charCodeAt(0)).join(', ')})`);
        if (key === quiz.target_group) {
          console.log(`  ✅ EXACT MATCH with quiz.target_group '${quiz.target_group}'`);
        } else if (key.trim() === quiz.target_group?.trim()) {
          console.log(`  ⚠️ MATCH AFTER TRIM: '${key}' matches '${quiz.target_group}'`);
        }
      });
      
      if (directMatch) {
        console.log(`✅ Exact match found: quiz.target_group '${quiz.target_group}' equals targetgroup.code '${directMatch.code}'`); 
        minAge = directMatch.minAge;
        maxAge = directMatch.maxAge;
        matched = true;
      } else {
        // Try again after trimming whitespace
        const trimmedTarget = quiz.target_group?.trim();
        const trimMatch = Array.from(targetGroupAgeMap.entries()).find(
          ([code]) => code.trim() === trimmedTarget
        );
        
        if (trimMatch) {
          console.log(`✅ Match after trimming whitespace: '${quiz.target_group}' matches '${trimMatch[0]}'`);
          minAge = trimMatch[1].minAge;
          maxAge = trimMatch[1].maxAge;
          matched = true;
        } else {
          // If no match is found, log the discrepancy
          console.log(`❌ No match: quiz.target_group '${quiz.target_group}' doesn't match any targetgroup.code`);
        }
      }
      
      // For debugging
      console.log(`Final age range for quiz ${quiz.id}: ${minAge}-${maxAge}`);
      
      // Count eligible contestants based on age from targetgroup
      const eligibleResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM contestant 
        WHERE age >= ${minAge} AND age <= ${maxAge} AND status = 'ACTIVE'
      `;
      
      eligibleCount = Number((eligibleResult as any)[0].count);
      
      // Count answered attempts for this quiz
      const answeredResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT contestantId) as count 
        FROM quiz_attempt 
        WHERE quizId = ${quiz.id}
      `;
      
      answeredCount = Number((answeredResult as any)[0].count);
      
      // Calculate percentage
      const percentAnswered = eligibleCount > 0 
        ? Math.round((answeredCount / eligibleCount) * 100) 
        : 0;
      
      // Always provide an age range string, even if no match was found
      // This ensures the frontend always gets a string value it can display
      quizStatistics.push({
        quizId: quiz.id,
        quizName: quiz.quiz_name,
        targetGroup: quiz.target_group,
        ageRange: `${minAge}-${maxAge}`, // Always provide the age range, even with default values
        matched: matched, // Add a boolean flag to indicate if a match was found
        totalEligible: eligibleCount,
        totalAnswered: answeredCount,
        percentAnswered: percentAnswered
      });
    }
    
    return NextResponse.json(quizStatistics);
    
  } catch (error) {
    console.error("[API] Error getting quiz statistics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
