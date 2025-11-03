import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Prerequisite {
  prerequisite: string  // Changed from 'type' to 'prerequisite'
  id: number
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { certificateId, contestantId } = await request.json()

    if (!certificateId || !contestantId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    console.log(`[Prerequisite Check] CertID: ${certificateId}, ContestantID: ${contestantId}`)

    // Get certificate with template prerequisites
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            prerequisites: true
          }
        }
      }
    })

    if (!certificate) {
      console.log('[Prerequisite Check] Certificate not found')
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    console.log('[Prerequisite Check] Template:', certificate.template?.templateName)
    console.log('[Prerequisite Check] Prerequisites:', certificate.template?.prerequisites)

    // If no prerequisites, allow download
    if (!certificate.template?.prerequisites) {
      console.log('[Prerequisite Check] No prerequisites - allowing download')
      return NextResponse.json({
        canDownload: true,
        message: 'No prerequisites required'
      })
    }

    let prerequisites: Prerequisite[]
    try {
      prerequisites = certificate.template.prerequisites as unknown as Prerequisite[]
    } catch {
      prerequisites = []
    }
    
    if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
      return NextResponse.json({
        canDownload: true,
        message: 'No prerequisites required'
      })
    }

    // Check each prerequisite
    const incompletePrerequsites: string[] = []

    console.log(`[Prerequisite Check] Checking ${prerequisites.length} prerequisites`)

    for (const prereq of prerequisites) {
      console.log(`[Prerequisite Check] Checking prerequisite: ${prereq.prerequisite}, ID: ${prereq.id}`)
      
      if (prereq.prerequisite === 'survey') {
        // Check if survey submission exists
        const surveySubmission = await prisma.survey_submission_status.findFirst({
          where: {
            surveyId: prereq.id,
            contestantId: contestantId
          }
        })

        console.log(`[Prerequisite Check] Survey ${prereq.id} submission found:`, !!surveySubmission)

        if (!surveySubmission) {
          // Survey not completed
          const surveyName = prereq.name || `Survey ID ${prereq.id}`
          incompletePrerequsites.push(`Soal selidik: ${surveyName}`)
          console.log(`[Prerequisite Check] Survey ${prereq.id} NOT completed`)
        } else {
          console.log(`[Prerequisite Check] Survey ${prereq.id} completed`)
        }
      }
      // Add more prerequisite types here if needed in the future
    }

    // If there are incomplete prerequisites, return error
    if (incompletePrerequsites.length > 0) {
      console.log(`[Prerequisite Check] ${incompletePrerequsites.length} incomplete prerequisites - blocking download`)
      return NextResponse.json({
        canDownload: false,
        message: 'Prasyarat belum lengkap',
        incomplete: incompletePrerequsites,
        detailedMessage: `Sila lengkapkan prasyarat berikut sebelum memuat turun sijil:\n\n${incompletePrerequsites.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      })
    }

    // All prerequisites completed
    console.log('[Prerequisite Check] All prerequisites completed - allowing download')
    return NextResponse.json({
      canDownload: true,
      message: 'Semua prasyarat telah lengkap'
    })

  } catch (error) {
    console.error('Error checking prerequisites:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check prerequisites',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
