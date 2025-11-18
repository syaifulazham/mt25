import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's participant record and find their contingent
    const participant = await prisma.user_participant.findUnique({
      where: { email: session.user.email! },
      select: { 
        id: true,
        managedContingents: {
          select: {
            contingentId: true
          },
          take: 1
        },
        contingents: {
          select: {
            id: true,
            name: true
          },
          take: 1
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ certificate: null })
    }

    // Get contingent ID - either from managed contingents or owned contingents
    let contingentId: number | null = null
    let contingentName: string | null = null

    if (participant.managedContingents.length > 0) {
      contingentId = participant.managedContingents[0].contingentId
      // Get contingent name
      const contingent = await prisma.contingent.findUnique({
        where: { id: contingentId },
        select: { name: true }
      })
      contingentName = contingent?.name || null
    } else if (participant.contingents.length > 0) {
      contingentId = participant.contingents[0].id
      contingentName = participant.contingents[0].name
    }

    if (!contingentId) {
      return NextResponse.json({ certificate: null })
    }

    // Find contingent certificate
    const certificates = await prisma.certificate.findMany({
      where: {
        templateId: {
          in: await prisma.certTemplate.findMany({
            where: { targetType: 'CONTINGENT' },
            select: { id: true }
          }).then(templates => templates.map(t => t.id))
        },
        status: 'READY'
      },
      include: {
        template: {
          select: {
            templateName: true,
            id: true
          }
        }
      }
    })

    // Filter by contingentId in ownership JSON
    const certificate = certificates.find(cert => {
      try {
        const ownership = cert.ownership as any
        return ownership?.contingentId === contingentId
      } catch {
        return false
      }
    })

    if (!certificate) {
      return NextResponse.json({ certificate: null })
    }

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        recipientName: certificate.recipientName,
        serialNumber: certificate.serialNumber,
        uniqueCode: certificate.uniqueCode,
        filePath: certificate.filePath,
        status: certificate.status,
        templateName: certificate.template.templateName,
        contingentName: contingentName
      }
    })

  } catch (error) {
    console.error('Error fetching contingent certificate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    )
  }
}
