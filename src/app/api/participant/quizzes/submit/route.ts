import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getToken } from "next-auth/jwt";

interface QuizSubmission {
  quizId: number;
  attemptId: number;
  hashcode: string; // Contestant hashcode
  timeUsed: number; // Time taken in seconds
  answers: Array<{
    questionId: number;
    selectedOptions: string[];
  }>;
}

// POST /api/participant/quizzes/submit
// Submit a completed quiz with answers
export async function POST(request: NextRequest) {
  try {
    // First verify the participant/manager session is valid
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get session token to check if it's an admin/organizer
    const token = await getToken({ req: request });
    if (token?.userType === "organizer") {
      return NextResponse.json({ error: "Access denied. Organizers cannot submit quizzes." }, { status: 403 });
    }

    // Get submission data
    const data: QuizSubmission = await request.json();
    
    if (!data.quizId || !data.hashcode || !data.attemptId || !Array.isArray(data.answers) || data.answers.length === 0) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }
    
    // Verify contestant exists
    const contestant = await prisma.contestant.findUnique({
      where: { hashcode: data.hashcode }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Invalid contestant credentials" }, { status: 401 });
    }

    // Fetch quiz and questions to validate the submission
    const quiz = await prisma.quiz.findUnique({
      where: { 
        id: data.quizId,
        status: "published" 
      },
      include: {
        quiz_questions: {
          include: {
            question: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found or not available" }, { status: 404 });
    }

    // Check if the specified attempt exists and is in progress
    const existingAttempt = await prisma.quiz_attempt.findFirst({
      where: {
        id: data.attemptId,
        quizId: data.quizId,
        contestantId: contestant.id,
        status: "started"
      }
    });

    if (!existingAttempt) {
      return NextResponse.json({ error: "No active quiz attempt found" }, { status: 400 });
    }

    // Check if the contestant has already completed this quiz (other than the current attempt)
    const completedAttempt = await prisma.quiz_attempt.findFirst({
      where: {
        quizId: data.quizId,
        contestantId: contestant.id,
        status: "completed",
        id: { not: data.attemptId }
      }
    });

    if (completedAttempt) {
      return NextResponse.json({ 
        error: "You have already completed this quiz in another session",
        attemptId: completedAttempt.id
      }, { status: 403 });
    }

    // Calculate score and validate answers
    let totalScore = 0;
    const answersWithResults = [];

    for (const answer of data.answers) {
      const quizQuestion = quiz.quiz_questions.find(qq => qq.id === answer.questionId);
      
      if (!quizQuestion) {
        continue; // Skip invalid question IDs
      }

      const question = quizQuestion.question;
      const correctAnswers = question.answer_correct.split(',');
      
      // Check if answer is correct based on answer type
      let isCorrect = false;
      
      if (question.answer_type === "multiple_selection") {
        // For multiple selection, all selected options must match the correct options exactly
        const selectedSorted = [...answer.selectedOptions].sort().join(',');
        const correctSorted = [...correctAnswers].sort().join(',');
        isCorrect = selectedSorted === correctSorted;
      } else {
        // For single selection or binary, there's only one correct option
        isCorrect = answer.selectedOptions.length === 1 && 
                    correctAnswers.includes(answer.selectedOptions[0]);
      }
      
      // Calculate points
      const pointsEarned = isCorrect ? quizQuestion.points : 0;
      totalScore += pointsEarned;
      
      answersWithResults.push({
        questionId: answer.questionId,
        selectedOptions: answer.selectedOptions,
        isCorrect,
        pointsEarned,
        maxPoints: quizQuestion.points
      });
    }

    // Calculate percentage score
    const maxScore = quiz.quiz_questions.reduce((sum, q) => sum + q.points, 0);
    const percentageScore = Math.round((totalScore / maxScore) * 100);

    // Update the quiz attempt as completed
    const updatedAttempt = await prisma.quiz_attempt.update({
      where: {
        id: existingAttempt.id
      },
      data: {
        status: "completed",
        score: totalScore,
        end_time: new Date(),
        time_taken: data.timeUsed
      }
    });

    // Save individual answers
    for (const answerResult of answersWithResults) {
      await prisma.quiz_answer.create({
        data: {
          attemptId: existingAttempt.id,
          questionId: answerResult.questionId,
          selected_options: answerResult.selectedOptions,
          is_correct: answerResult.isCorrect,
          points_earned: answerResult.pointsEarned
        }
      });
    }

    // Return quiz results
    return NextResponse.json({
      success: true,
      quizId: data.quizId,
      attemptId: existingAttempt.id,
      contestantId: contestant.id,
      contestantName: contestant.name,
      totalScore,
      maxScore,
      percentageScore,
      correctAnswers: answersWithResults.filter(a => a.isCorrect).length,
      totalQuestions: quiz.quiz_questions.length,
      timeUsed: data.timeUsed,
      answers: answersWithResults,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error submitting quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
