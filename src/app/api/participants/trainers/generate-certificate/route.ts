import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import prisma from '@/lib/prisma'
import { CertificateSerialService } from '@/lib/services/certificate-serial-service'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let managerId: number | undefined
  let managerIc: string | undefined
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    managerId = body.managerId
    managerIc = body.managerIc

    if (!managerId || !managerIc) {
      return NextResponse.json(
        { error: 'Manager ID and IC are required' },
        { status: 400 }
      )
    }

    // Get manager basic info
    console.log('Fetching manager with ID:', managerId)
    const manager = await prisma.manager.findUnique({
      where: { id: managerId }
    })

    if (!manager) {
      console.log('Manager not found for ID:', managerId)
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
    }

    console.log('Manager found:', { id: manager.id, name: manager.name })

    // Get contingent info through manager_team junction table
    console.log('Fetching contingent data for manager:', managerId)
    const contingentData = await prisma.$queryRaw`
      SELECT DISTINCT
        c.id as contingentId,
        c.name as contingentName,
        s.name as schoolName,
        ss.name as schoolStateName,
        hi.name as higherInstitutionName,
        his.name as higherInstitutionStateName,
        i.name as independentName,
        is_state.name as independentStateName
      FROM manager_team mt
      INNER JOIN team t ON mt.teamId = t.id
      INNER JOIN contingent c ON t.contingentId = c.id
      LEFT JOIN school s ON c.schoolId = s.id
      LEFT JOIN state ss ON s.stateId = ss.id
      LEFT JOIN higherinstitution hi ON c.higherInstId = hi.id
      LEFT JOIN state his ON hi.stateId = his.id
      LEFT JOIN independent i ON c.independentId = i.id
      LEFT JOIN state is_state ON i.stateId = is_state.id
      WHERE mt.managerId = ${managerId}
      LIMIT 1
    ` as any[]

    // Build contingent object from raw query result
    const contingent = contingentData.length > 0 ? {
      id: contingentData[0].contingentId,
      name: contingentData[0].contingentName,
      school: contingentData[0].schoolName ? {
        name: contingentData[0].schoolName,
        state: contingentData[0].schoolStateName ? {
          name: contingentData[0].schoolStateName
        } : null
      } : null,
      higherInstitution: contingentData[0].higherInstitutionName ? {
        name: contingentData[0].higherInstitutionName,
        state: contingentData[0].higherInstitutionStateName ? {
          name: contingentData[0].higherInstitutionStateName
        } : null
      } : null,
      independent: contingentData[0].independentName ? {
        name: contingentData[0].independentName,
        state: contingentData[0].independentStateName ? {
          name: contingentData[0].independentStateName
        } : null
      } : null
    } : null

    console.log('Contingent data fetched:', contingent ? { id: contingent.id, name: contingent.name } : 'No contingent found')

    // Find the TRAINERS template
    console.log('Looking for TRAINERS template')
    const template = await prisma.certTemplate.findFirst({
      where: {
        targetType: 'TRAINERS'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!template) {
      console.log('No TRAINERS template found')
      return NextResponse.json(
        { error: 'No active trainer certificate template found' },
        { status: 404 }
      )
    }

    console.log('Template found:', { id: template.id, name: template.templateName })

    // Check if certificate already exists
    console.log('Checking for existing certificate')
    const existingCert = await prisma.certificate.findFirst({
      where: {
        ic_number: managerIc,
        templateId: template.id
      }
    })

    let certificate
    let isNewCertificate = false

    if (existingCert) {
      // Certificate record exists - update it for regeneration with latest data
      console.log('Updating existing certificate:', existingCert.id)
      
      // Get institution name from contingent (if available)
      const institutionName = contingent?.school?.name ||
        contingent?.higherInstitution?.name ||
        contingent?.independent?.name ||
        ''
      
      certificate = await prisma.certificate.update({
        where: { id: existingCert.id },
        data: {
          recipientName: manager.name, // Update with current name
          recipientEmail: manager.email || null, // Update email
          contingent_name: contingent?.name || null, // Update contingent name
          filePath: null, // On-demand generation
          status: 'READY',
          updatedAt: new Date()
        }
      })
      console.log('Certificate updated successfully with latest data')
    } else {
      // Create new certificate record
      isNewCertificate = true
      console.log('Creating new certificate')

      // Generate new identifiers
      const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      console.log('Generating serial number for template:', template.id)
      const serialNumber = await CertificateSerialService.generateSerialNumber(template.id, template.targetType)
      console.log('Serial number generated:', serialNumber)

      // Get institution name from contingent (if available)
      const institutionName = contingent?.school?.name ||
        contingent?.higherInstitution?.name ||
        contingent?.independent?.name ||
        ''

      console.log('Certificate data to create:', {
        recipientName: manager.name,
        ic_number: managerIc,
        templateId: template.id
      })

      certificate = await prisma.certificate.create({
        data: {
          recipientName: manager.name,
          recipientType: 'TRAINER',
          recipientEmail: manager.email || null,
          ic_number: managerIc,
          uniqueCode: uniqueCode,
          serialNumber: serialNumber,
          filePath: null, // On-demand generation
          status: 'READY',
          templateId: template.id
          // createdBy is omitted - will be null (allowed by schema)
        }
      })
      console.log('Certificate created successfully:', certificate.id)
    }

    return NextResponse.json({
      success: true,
      message: isNewCertificate ? 'Certificate created successfully' : 'Certificate updated successfully',
      certificate: {
        id: certificate.id,
        uniqueCode: certificate.uniqueCode,
        serialNumber: certificate.serialNumber,
        status: certificate.status,
        templateName: template.templateName
      },
      isNewCertificate
    })

  } catch (error) {
    console.error('Error generating trainer certificate:', error)
    
    // Return detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      managerId,
      managerIc
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate certificate',
        details: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
