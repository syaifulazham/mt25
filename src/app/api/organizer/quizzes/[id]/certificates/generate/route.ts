import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

interface GenerateCertificateRequest {
  contestantId: number;
  certificateType: 'PARTICIPATION' | 'ACHIEVEMENT';
  templateId?: number; // Optional, will auto-detect if not provided
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const quizId = parseInt(params.id);
    const body: GenerateCertificateRequest = await request.json();
    const { contestantId, certificateType, templateId } = body;

    // Validate inputs
    if (!contestantId || !certificateType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, quiz_name: true, target_group: true }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Validate contestant exists and has attempted the quiz
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        },
        quizAttempts: {
          where: { quizId },
          orderBy: { score: 'desc' },
          take: 1,
          select: {
            id: true,
            score: true,
            status: true
          }
        }
      }
    });

    if (!contestant) {
      return NextResponse.json(
        { error: 'Contestant not found' },
        { status: 404 }
      );
    }

    if (contestant.quizAttempts.length === 0) {
      return NextResponse.json(
        { error: 'Contestant has not attempted this quiz' },
        { status: 400 }
      );
    }

    const attempt = contestant.quizAttempts[0];

    // Determine template to use
    let template;
    if (templateId) {
      template = await prisma.certTemplate.findFirst({
        where: {
          id: templateId,
          quizId,
          status: 'ACTIVE'
        }
      });
    } else {
      // Auto-detect template based on certificate type
      const targetType = certificateType === 'PARTICIPATION' ? 'QUIZ_PARTICIPANT' : 'QUIZ_WINNER';
      template = await prisma.certTemplate.findFirst({
        where: {
          quizId,
          targetType,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!template) {
      return NextResponse.json(
        { error: `No active certificate template found for ${certificateType === 'PARTICIPATION' ? 'participants' : 'winners'}` },
        { status: 404 }
      );
    }

    // Check if certificate already exists
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        templateId: template.id,
        ownership: {
          path: ['contestantId'],
          equals: contestantId
        }
      }
    });

    if (existingCertificate) {
      return NextResponse.json(
        { 
          error: 'Certificate already generated for this contestant',
          certificate: existingCertificate
        },
        { status: 409 }
      );
    }

    // Generate unique code
    const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Generate serial number
    const serialNumber = await CertificateSerialService.generateSerialNumber(
      template.targetType as any,
      template.id
    );

    // Determine award title for winners
    let awardTitle = null;
    if (certificateType === 'ACHIEVEMENT') {
      // Get contestant's rank
      const allAttempts = await prisma.quiz_attempt.findMany({
        where: {
          quizId,
          status: 'completed'
        },
        orderBy: [
          { score: 'desc' },
          { time_taken: 'asc' }
        ],
        select: { contestantId: true }
      });

      const rank = allAttempts.findIndex(a => a.contestantId === contestantId) + 1;
      
      if (rank === 1) {
        awardTitle = '1st Place';
      } else if (rank === 2) {
        awardTitle = '2nd Place';
      } else if (rank === 3) {
        awardTitle = '3rd Place';
      } else if (rank <= 10) {
        awardTitle = `${rank}th Place`;
      } else {
        awardTitle = `Top ${rank}`;
      }
    }

    // Create certificate
    const certificate = await prisma.certificate.create({
      data: {
        templateId: template.id,
        recipientName: contestant.name,
        recipientType: 'PARTICIPANT',
        contingent_name: contestant.contingent.name,
        uniqueCode,
        serialNumber,
        awardTitle,
        status: 'READY',
        ownership: {
          year: new Date().getFullYear(),
          contingentId: contestant.contingent.id,
          contestantId: contestant.id,
          quizId: quizId,
          score: attempt.score
        },
        issuedAt: new Date(),
        createdBy: null // Organizer-generated
      }
    });

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        uniqueCode: certificate.uniqueCode,
        serialNumber: certificate.serialNumber,
        status: certificate.status,
        awardTitle: certificate.awardTitle,
        recipientName: certificate.recipientName
      }
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
