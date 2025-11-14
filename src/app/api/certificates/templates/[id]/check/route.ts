import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateId = parseInt(params.id)
    const body = await request.json()
    const { icNumbers } = body

    if (!Array.isArray(icNumbers)) {
      return NextResponse.json(
        { error: 'icNumbers array is required' },
        { status: 400 }
      )
    }

    // Fetch certificates for the given IC numbers and template
    const certificates = await prisma.certificate.findMany({
      where: {
        ic_number: {
          in: icNumbers
        },
        templateId: templateId
      },
      select: {
        id: true,
        ic_number: true,
        uniqueCode: true,
        serialNumber: true,
        status: true
      }
    })

    // Convert to a map for easy lookup
    const certificateMap: Record<string, any> = {}
    certificates.forEach(cert => {
      if (cert.ic_number) {
        certificateMap[cert.ic_number] = {
          id: cert.id,
          uniqueCode: cert.uniqueCode,
          serialNumber: cert.serialNumber,
          status: cert.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      certificates: certificateMap
    })

  } catch (error) {
    console.error('Error checking certificates:', error)
    return NextResponse.json(
      { error: 'Failed to check certificates' },
      { status: 500 }
    )
  }
}
