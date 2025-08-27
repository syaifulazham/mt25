import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuestionAuthorization } from "./auth-utils";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/organizer/questions
// Get questions with pagination, sorting, and filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuestionAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || '1');
    const pageSize = parseInt(searchParams.get("pageSize") || '30');
    
    // Calculate skip value for pagination
    const skip = (page - 1) * pageSize;
    
    // Search and filtering parameters
    const search = searchParams.get("search") || "";
    const targetGroup = searchParams.get("targetGroup") || undefined;
    const knowledgeField = searchParams.get("knowledgeField") || undefined;
    const answerType = searchParams.get("answerType") || undefined;
    
    // Sorting parameters
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    
    // Build filter object
    const filters: any = {
      target_group: targetGroup ?? undefined,
      knowledge_field: knowledgeField ?? undefined,
      answer_type: answerType ?? undefined,
      ...(search ? {
        OR: [
          { question: { contains: search, mode: 'insensitive' } },
          { knowledge_field: { contains: search, mode: 'insensitive' } },
        ]
      } : {})
    };
    
    // Clean up undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    // Dynamic orderBy object
    const orderBy: any = {};
    orderBy[sortField] = sortOrder;
    
    // Get total count for pagination
    const totalCount = await prisma.question_bank.count({
      where: Object.keys(filters).length > 0 ? filters : undefined
    });
    
    // Get paginated and sorted questions
    const questions = await prisma.question_bank.findMany({
      where: Object.keys(filters).length > 0 ? filters : undefined,
      include: {
        quiz_questions: {
          select: {
            quizId: true
          }
        }
      },
      orderBy,
      skip,
      take: pageSize
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Transform the data to match the frontend expectations
    const formattedQuestions = questions.map(question => ({
      id: question.id,
      question: question.question,
      question_image: question.question_image,
      target_group: question.target_group,
      knowledge_field: question.knowledge_field,
      answer_type: question.answer_type,
      answer_options: question.answer_options,
      answer_correct: question.answer_correct,
      createdAt: question.createdAt.toISOString(),
      createdBy: question.createdBy || 'Unknown',
      creatorName: question.createdBy || 'Unknown' // Use createdBy string directly now
    }));

    // Prepare response with pagination metadata
    const response = {
      questions: formattedQuestions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };

    console.log(`[API] Returning page ${page}/${totalPages} with ${formattedQuestions.length} questions`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error getting questions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/organizer/questions
// Create a new question
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuestionAuthorization(user);
    
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || '';
    let data;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData submission
      const formData = await request.formData();
      
      // Convert FormData to object
      data = {} as Record<string, any>;
      for (const [key, value] of formData.entries()) {
        // Special handling for answer_options as JSON string
        if (key === 'answer_options') {
          try {
            data[key] = JSON.parse(value as string);
          } catch (e) {
            console.error('Error parsing answer_options:', e);
            data[key] = value;
          }
        } else if (key === 'image_file' && typeof value === 'object' && value !== null && 'arrayBuffer' in value && 'type' in value) {
          // Handle file upload - convert to base64
          // Using typeof and property checks instead of instanceof File which is not available in Node.js
          const buffer = await (value as Blob).arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = (value as Blob).type;
          data['question_image'] = `data:${mimeType};base64,${base64}`;
        } else {
          data[key] = value;
        }
      }
    } else {
      // Handle JSON submission
      data = await request.json();
    }

    // Validate required fields
    if (!data.question || !data.target_group || !data.knowledge_field || !data.answer_type || !data.answer_options || !data.answer_correct) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    // Validate answer_options format based on answer_type
    if (typeof data.answer_options !== 'object') {
      return NextResponse.json(
        { error: "answer_options must be an array or object" },
        { status: 400 }
      );
    }

    // Validate that the correct answer exists in the options
    if (data.answer_type === "multiple_selection") {
      const correctAnswers = data.answer_correct.split(',');
      const optionKeys = data.answer_options.map((opt: any) => opt.option);
      const isValid = correctAnswers.every((ans: string) => optionKeys.includes(ans));
      
      if (!isValid) {
        return NextResponse.json(
          { error: "Correct answers must all exist in the options" },
          { status: 400 }
        );
      }
    } else {
      // For single_selection and binary
      const optionKeys = data.answer_options.map((opt: any) => opt.option);
      if (!optionKeys.includes(data.answer_correct)) {
        return NextResponse.json(
          { error: "Correct answer must exist in the options" },
          { status: 400 }
        );
      }
    }

    // For debugging purposes, let's log the user info and the request data
    console.log('[API] Creating question with data:', {
      targetGroup: data.target_group,
      knowledgeField: data.knowledge_field,
      userId: user?.id,
      userName: user?.name || user?.email || 'Unknown',
      isParticipant: user ? (user as any).isParticipant : false
    });
    
    // Get creator info (name or email) to store as string
    const creatorInfo = user?.name || user?.email || 'Admin user';
    
    // Create the question with creator info as string
    const question = await prisma.question_bank.create({
      data: {
        question: data.question,
        question_image: data.question_image,
        target_group: data.target_group,
        knowledge_field: data.knowledge_field,
        answer_type: data.answer_type,
        answer_options: data.answer_options,
        answer_correct: data.answer_correct,
        createdBy: creatorInfo  // Use name/email as string instead of ID
      }
    });
    
    console.log(`[API] Created question with ID ${question.id}, creator: ${creatorInfo}`);
    
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating question:", error);
    return NextResponse.json({ error: `Error saving question: ${error}` }, { status: 500 });
  }
}
