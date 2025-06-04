import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

interface SurveyBase {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  contestantCount: number;
  answerCount: number;
}

interface SurveyQuestion {
  id: number;
  surveyId: number;
  question: string;
  questionType: string;
  options: any | null; // Prisma typically returns JSON as `any` or a specific type if mapped
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/survey
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get surveys with question counts, contestant assignment counts, and answer counts using raw SQL
    const surveys = await prisma.$queryRaw<SurveyBase[]>`
      SELECT 
        s.id, 
        s.name, 
        s.description, 
        s.status,
        s.createdAt, 
        s.updatedAt,
        COUNT(DISTINCT sq.id) as questionCount,
        COUNT(DISTINCT scc.contestantId) as contestantCount,
        COUNT(DISTINCT sa.id) as answerCount
      FROM survey s
      LEFT JOIN survey_question sq ON s.id = sq.surveyId
      LEFT JOIN survey_contestants_composition scc ON s.id = scc.surveyId
      LEFT JOIN survey_answer sa ON s.id = sa.surveyId
      GROUP BY s.id
      ORDER BY s.updatedAt DESC
    `;
    
    // For each survey, get its questions
    const surveysWithQuestions = await Promise.all(surveys.map(async (survey) => {
      const questions = await prisma.$queryRaw<SurveyQuestion[]>`
        SELECT id, surveyId, question, questionType, options, displayOrder, createdAt, updatedAt
        FROM survey_question
        WHERE surveyId = ${survey.id}
        ORDER BY displayOrder ASC, id ASC
      `;
      
      return {
        id: survey.id,
        name: survey.name,
        description: survey.description,
        status: survey.status,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
        questionCount: Number(survey.questionCount),
        contestantCount: Number(survey.contestantCount),
        answerCount: Number(survey.answerCount),
        questions,
        _count: {
          questions: Number(survey.questionCount),
          contestantsComposition: Number(survey.contestantCount),
          answers: Number(survey.answerCount)
        }
      };
    }));

    return NextResponse.json(surveysWithQuestions);
  } catch (error) {
    console.error("Error fetching surveys:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}

// POST /api/survey
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Survey name is required" },
        { status: 400 }
      );
    }

    const now = new Date();
    
    // Use a transaction to create survey and questions
    const result = await prisma.$transaction(async (tx) => {
      // Create the survey using raw SQL
      await tx.$executeRaw`
        INSERT INTO survey (name, description, createdAt, updatedAt)
        VALUES (${data.name}, ${data.description || null}, ${now}, ${now})
      `;
      
      // Get the ID of the newly inserted survey
      const [surveyIdResult] = await tx.$queryRaw<[{ id: number }]>`SELECT LAST_INSERT_ID() as id`;
      const surveyId = surveyIdResult.id;

      // Fetch the newly created survey details
      const [surveyResult] = await tx.$queryRaw<any[]>`
        SELECT id, name, description, createdAt, updatedAt 
        FROM survey 
        WHERE id = ${surveyId}
      `;
      
      const questions: any[] = [];
      
      // Create questions if provided
      if (data.questions && data.questions.length > 0) {
        for (const questionData of data.questions) {
          // Assuming questionData is an object: { question: string, questionType?: string, options?: any[], displayOrder?: number }
          const questionText = questionData.question;
          const questionType = questionData.questionType || 'text';
          // MySQL doesn't support arrays directly, so we need to serialize to JSON string
          const options = questionData.options ? JSON.stringify(questionData.options) : null;
          const displayOrder = questionData.displayOrder || 0;
          
          if (questionText && questionText.trim()) {
            await tx.$executeRaw`
              INSERT INTO survey_question (surveyId, question, questionType, options, displayOrder, createdAt, updatedAt)
              VALUES (${surveyId}, ${questionText}, ${questionType}, ${options}, ${displayOrder}, ${now}, ${now})
            `;
            // Get the ID of the newly inserted question
            const [questionIdResult] = await tx.$queryRaw<[{ id: number }]>`SELECT LAST_INSERT_ID() as id`;
            const questionId = questionIdResult.id;

            // Fetch the newly created question details, using the updated SurveyQuestion interface
            const [question] = await tx.$queryRaw<SurveyQuestion[]>`
              SELECT id, surveyId, question, questionType, options, displayOrder, createdAt, updatedAt
              FROM survey_question
              WHERE id = ${questionId}
            `;
            questions.push(question);
          }
        }
      }
      
      return {
        ...surveyResult,
        questions
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating survey:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Extract more helpful error information
    let errorMessage = "Failed to create survey";
    let statusCode = 500;
    
    // Handle Prisma errors (type assertion for error properties)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2010') {
      const meta = error.meta as { message?: string } || {};
      errorMessage = `Database error: ${meta.message || 'Invalid data format'}. Make sure all array data is properly serialized.`;
      statusCode = 400;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error && typeof error === 'object' && 'meta' in error ? error.meta : {} },
      { status: statusCode }
    );
  }
}
