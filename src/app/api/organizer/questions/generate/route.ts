import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import OpenAI from "openai";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Define types for the generated questions
interface GeneratedQuestion {
  question: string;
  question_image: string;
  answer_type: string;
  answer_options: { option: string; answer: string }[];
  answer_correct: string;
}

// POST /api/organizer/questions/generate
// Generate questions using AI and add them to the question bank
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // If no user is found in the session, return unauthorized
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Verify that this is an organizer account - we need to check based on user type
    // The user from getCurrentUser() is either user_participant or user (organizer)
    if ('role' in user) {
      // This is an organizer user
      if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(user.role)) {
        return NextResponse.json({ error: "Unauthorized - Insufficient privileges" }, { status: 403 });
      }
    } else {
      // This is a participant user - not allowed to access
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.target_group || !data.knowledge_field || !data.count || !data.difficulty || !data.answer_type) {
      return NextResponse.json(
        { error: "Required fields missing: target_group, knowledge_field, count, difficulty, answer_type" },
        { status: 400 }
      );
    }
    
    // Set default language to English if not specified
    const language = data.language || 'english';

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error("[API] OpenAI API key is not configured");
      return NextResponse.json({ error: "OpenAI API is not properly configured" }, { status: 500 });
    }

    // Build prompt for OpenAI
    let specificTopics = data.specific_topics ? `Focus on these specific topics: ${data.specific_topics}.` : '';
    let includeImages = data.with_images ? "Include a brief description for an appropriate image where relevant." : '';
    
    // Add language instruction
    let languageInstruction = '';
    if (language === 'malay') {
      languageInstruction = "Generate all questions and answers in Bahasa Melayu. Pastikan semua soalan dan jawapan ditulis dalam Bahasa Melayu yang standard dan gramatis.";
    } else {
      languageInstruction = "Generate all questions and answers in English.";
    }
    
    // Create a structured prompt that will help OpenAI format the response correctly
    const systemPrompt = `You are an expert educational content creator specializing in creating high-quality quiz questions.
    Your task is to generate ${data.count} ${data.difficulty} level questions about ${data.knowledge_field} for ${data.target_group} students.
    ${specificTopics}
    ${includeImages}
    ${languageInstruction}
    
    Your response MUST be a valid JSON object with the following structure:
    {
      "questions": [
        {
          "question": "The full question text",
          "question_image": "Brief description of an appropriate image if relevant, or empty string",
          "answer_type": "${data.answer_type}",
          "answer_options": [{"option": "A", "answer": "First option"}, {"option": "B", "answer": "Second option"}, ...],
          "answer_correct": "The correct option letter(s) - comma separated for multiple selection"
        },
        ...
      ]
    }

    For answer_type:
    - "single_selection": Provide 4 options, with exactly one correct answer
    - "multiple_selection": Provide 4-6 options, with 2 or more correct answers
    - "binary": Provide only 2 options (True/False, Yes/No, etc.)

    Make sure the difficulty level (${data.difficulty}) is appropriate for the target group (${data.target_group}).
    Make all questions relevant to ${data.knowledge_field}.
    
    IMPORTANT: Your response MUST be a valid JSON object and NOTHING ELSE. No explanations, no other text.`;

    // Call OpenAI API - using a model that supports longer outputs
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k", // More widely available model with good context length
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${data.count} ${data.difficulty} ${data.answer_type} questions about ${data.knowledge_field} for ${data.target_group} education level in ${language === 'malay' ? 'Bahasa Melayu' : 'English'}. Respond with ONLY a valid JSON object following the format in my instructions.` }
      ],
      temperature: 0.7,
      max_tokens: 3000
      // Removed response_format as it's not supported by all models
    });

    if (!response.choices[0].message.content) {
      throw new Error("OpenAI returned empty response");
    }

    // Parse the JSON response - handle potential parsing errors
    let parsedResponse;
    try {
      // The content might have markdown formatting or extra text, so try to extract JSON
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/); // Match anything between { and }
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      parsedResponse = JSON.parse(jsonStr);
    } catch (error) {
      console.error("Failed to parse OpenAI response as JSON:", error);
      console.log("Raw response:", response.choices[0].message.content);
      throw new Error("Failed to parse the AI-generated response as valid JSON");
    }
    
    const generatedQuestions = parsedResponse.questions || [];

    console.log(`[API] Generated ${generatedQuestions.length} questions using OpenAI`);

    // Process and validate the generated questions
    const validatedQuestions = generatedQuestions.map((q: any): GeneratedQuestion => {
      // Ensure all fields exist
      return {
        question: q.question,
        question_image: q.question_image || "",
        answer_type: q.answer_type || data.answer_type,
        answer_options: q.answer_options || [],
        answer_correct: q.answer_correct || ""
      };
    });

    // Get the current user's information to use as creator
    const currentUser = await getCurrentUser();
    const creatorInfo = currentUser?.name || currentUser?.email || 'System Generated';
    console.log(`Using creator info: ${creatorInfo} for generated questions`);
    
    // For information purposes, check if target group code exists in targetgroup table
    // but we don't need it for the relation anymore
    const targetGroup = await prisma.targetgroup.findFirst({
      where: {
        OR: [
          { code: data.target_group },
          { name: data.target_group }
        ]
      }
    });
    
    // We'll log a warning if target group doesn't exist but still allow question creation 
    // since there's no foreign key constraint anymore
    if (!targetGroup) {
      console.warn(`Warning: Target group not found with code or name: ${data.target_group}`);
    } else {
      console.log(`Found target group: ${targetGroup.name} (${targetGroup.code})`);
    }
    
    
    // Save the generated questions to the database
    const savedQuestions = [];
    
    for (const q of validatedQuestions) {
      try {
        // Create the question in the question_bank table
        const saved = await prisma.question_bank.create({
          data: {
            question: q.question,
            question_image: q.question_image,
            target_group: data.target_group, // Use the target group name directly as a string
            knowledge_field: data.knowledge_field,
            answer_type: q.answer_type,
            answer_options: q.answer_options,
            answer_correct: q.answer_correct,
            createdBy: creatorInfo // Use the name/email as string instead of ID
          }
        });
        
        savedQuestions.push(saved);
      } catch (error) {
        console.error("Error saving question:", error);
      }
    }

    return NextResponse.json({
      success: true,
      count: savedQuestions.length,
      questions: savedQuestions
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Error generating questions:", error);
    return NextResponse.json({ 
      error: "Failed to generate questions", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

// Mock function to generate questions - in a real implementation, this would call OpenAI
function generateMockQuestions(
  targetGroup: string,
  knowledgeField: string,
  difficulty: string,
  count: number,
  prompt?: string
) {
  const questions = [];
  const fields: Record<string, string[]> = {
    "math": ["algebra", "geometry", "calculus", "statistics"],
    "science": ["physics", "chemistry", "biology", "astronomy"],
    "history": ["ancient history", "modern history", "world wars", "civilizations"],
    "geography": ["countries", "capitals", "landforms", "climate"],
    "computer_science": ["programming", "algorithms", "data structures", "networking"]
  };
  
  const subField = fields[knowledgeField.toLowerCase()] ? 
    fields[knowledgeField.toLowerCase()][Math.floor(Math.random() * fields[knowledgeField.toLowerCase()].length)] : 
    knowledgeField;
  
  for (let i = 0; i < count; i++) {
    const questionType = Math.random() > 0.3 ? 
      "single_selection" : 
      (Math.random() > 0.5 ? "multiple_selection" : "binary");
    
    let questionText, options, correctAnswer;
    
    if (knowledgeField.toLowerCase() === "math") {
      if (questionType === "single_selection") {
        questionText = `What is the result of ${Math.floor(Math.random() * 20) + 10} + ${Math.floor(Math.random() * 20) + 10}?`;
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 20) + 10;
        const correctResult = a + b;
        options = [
          { option: "A", answer: `${correctResult}` },
          { option: "B", answer: `${correctResult + 1}` },
          { option: "C", answer: `${correctResult - 1}` },
          { option: "D", answer: `${correctResult + 2}` },
        ];
        correctAnswer = "A";
      } else if (questionType === "multiple_selection") {
        questionText = "Which of the following are prime numbers?";
        options = [
          { option: "A", answer: "2" },
          { option: "B", answer: "4" },
          { option: "C", answer: "7" },
          { option: "D", answer: "9" },
          { option: "E", answer: "11" },
        ];
        correctAnswer = "A,C,E";
      } else {
        questionText = "Is Pi a rational number?";
        options = [
          { option: "A", answer: "Yes" },
          { option: "B", answer: "No" }
        ];
        correctAnswer = "B";
      }
    } else if (knowledgeField.toLowerCase() === "science") {
      if (questionType === "single_selection") {
        questionText = "Which of the following is NOT a noble gas?";
        options = [
          { option: "A", answer: "Hydrogen" },
          { option: "B", answer: "Neon" },
          { option: "C", answer: "Argon" },
          { option: "D", answer: "Xenon" },
        ];
        correctAnswer = "A";
      } else if (questionType === "multiple_selection") {
        questionText = "Which of the following are mammals?";
        options = [
          { option: "A", answer: "Dolphin" },
          { option: "B", answer: "Shark" },
          { option: "C", answer: "Bat" },
          { option: "D", answer: "Penguin" },
          { option: "E", answer: "Whale" },
        ];
        correctAnswer = "A,C,E";
      } else {
        questionText = "Is water a compound?";
        options = [
          { option: "A", answer: "Yes" },
          { option: "B", answer: "No" }
        ];
        correctAnswer = "A";
      }
    } else {
      // Generic questions for other knowledge fields
      if (questionType === "single_selection") {
        questionText = `Question ${i+1} about ${subField} in the field of ${knowledgeField}`;
        options = [
          { option: "A", answer: `Answer option A for ${subField}` },
          { option: "B", answer: `Answer option B for ${subField}` },
          { option: "C", answer: `Answer option C for ${subField}` },
          { option: "D", answer: `Answer option D for ${subField}` },
        ];
        correctAnswer = ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];
      } else if (questionType === "multiple_selection") {
        questionText = `Multiple selection question ${i+1} about ${subField}`;
        options = [
          { option: "A", answer: `First option for ${subField}` },
          { option: "B", answer: `Second option for ${subField}` },
          { option: "C", answer: `Third option for ${subField}` },
          { option: "D", answer: `Fourth option for ${subField}` },
        ];
        // Select 2-3 correct answers randomly
        const correctOptions = ["A", "B", "C", "D"]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 2) + 2);
        correctAnswer = correctOptions.join(",");
      } else {
        questionText = `True/False question about ${subField} in ${knowledgeField}`;
        options = [
          { option: "A", answer: "True" },
          { option: "B", answer: "False" }
        ];
        correctAnswer = Math.random() > 0.5 ? "A" : "B";
      }
    }
    
    // Add difficulty level to the question
    const difficultyPrefix = difficulty === "easy" ? "Basic: " : 
                             difficulty === "medium" ? "Intermediate: " : 
                             "Advanced: ";
    
    questions.push({
      question: difficultyPrefix + questionText,
      question_image: null,
      answer_type: questionType,
      answer_options: options,
      answer_correct: correctAnswer
    });
  }
  
  return questions;
}

// GET /api/organizer/questions/generate/fields
// Get available knowledge fields for question generation
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // If no user is found in the session, return unauthorized
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }
    
    // Verify that this is an organizer account - we need to check based on user type
    if ('role' in user) {
      // This is an organizer user
      if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(user.role)) {
        return NextResponse.json({ error: "Unauthorized - Insufficient privileges" }, { status: 403 });
      }
    } else {
      // This is a participant user - not allowed to access
      return NextResponse.json({ error: "Unauthorized - Only organizers can access this endpoint" }, { status: 403 });
    }

    // In a real implementation, these would come from a database or configuration
    const knowledgeFields = [
      { value: "math", label: "Mathematics" },
      { value: "science", label: "Science" },
      { value: "history", label: "History" },
      { value: "geography", label: "Geography" },
      { value: "computer_science", label: "Computer Science" },
      { value: "language", label: "Language & Literature" },
      { value: "arts", label: "Arts & Culture" }
    ];

    const targetGroups = [
      { value: "PRIMARY", label: "Primary School" },
      { value: "SECONDARY", label: "Secondary School" },
      { value: "UNIVERSITY", label: "University" },
      { value: "PROFESSIONAL", label: "Professional" },
      { value: "ALL", label: "All Groups" }
    ];

    const difficultyLevels = [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" }
    ];

    return NextResponse.json({
      knowledgeFields,
      targetGroups,
      difficultyLevels
    });
  } catch (error) {
    console.error("[API] Error fetching generation fields:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
