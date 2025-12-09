import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'
import { prisma } from '@/lib/prisma'
import { generateCertificatePDF } from '@/lib/certificate-generator'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

// Configure route segment
export const maxDuration = 300 // 5 minutes timeout for bulk generation
export const dynamic = 'force-dynamic' // Always run dynamically

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }
    
    const userId = parseInt(session.user.id)
    
    // Parse request body
    const body = await request.json()
    const { certificateIds, saveToServer = true } = body
    
    // Validate inputs
    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return NextResponse.json(
        { error: 'Certificate IDs array is required and must not be empty' },
        { status: 400 }
      )
    }
    
    console.log(`Starting bulk PDF generation for ${certificateIds.length} certificates`)
    console.log(`Certificate IDs: ${certificateIds.join(', ')}`)
    console.log(`Save to server: ${saveToServer}`)
    
    // Fetch certificates with their templates
    const certificates = await prisma.certificate.findMany({
      where: {
        id: { in: certificateIds }
      },
      include: {
        template: true
      }
    })
    
    if (certificates.length === 0) {
      return NextResponse.json(
        { error: 'No certificates found' },
        { status: 404 }
      )
    }
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })
    
    const chunks: Buffer[] = []
    
    // Set up promise to wait for archive completion
    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        console.log('Archive finalized')
        resolve()
      })
      
      archive.on('error', (err) => {
        console.error('Archive error:', err)
        reject(err)
      })
    })
    
    // Listen for archive data
    archive.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
    })
    
    // Generate PDFs and add to ZIP
    const results = []
    
    console.log(`Processing ${certificates.length} certificates...`)
    
    for (let i = 0; i < certificates.length; i++) {
      const certificate = certificates[i]
      console.log(`[${i + 1}/${certificates.length}] Processing certificate ${certificate.id} - ${certificate.recipientName}`)
      
      try {
        // Check if template PDF exists
        const templateFullPath = path.join(process.cwd(), 'public', certificate.template.basePdfPath || '')
        if (!certificate.template.basePdfPath || !fs.existsSync(templateFullPath)) {
          console.error(`Template PDF not found for certificate ${certificate.id}: ${certificate.template.basePdfPath}`)
          results.push({
            id: certificate.id,
            recipientName: certificate.recipientName,
            success: false,
            error: 'Template PDF file not found'
          })
          continue
        }
        
        // Generate PDF
        const pdfPath = await generateCertificatePDF({
          template: {
            id: certificate.template.id,
            basePdfPath: certificate.template.basePdfPath || '',
            configuration: certificate.template.configuration
          },
          data: {
            recipient_name: certificate.recipientName,
            contingent_name: certificate.contingent_name || '',
            team_name: certificate.team_name || '',
            award_title: certificate.awardTitle || '',
            serial_number: certificate.serialNumber || '',
            unique_code: certificate.uniqueCode,
            ic_number: certificate.ic_number || '',
            contest_name: certificate.contestName || '',
            issue_date: new Date(certificate.issuedAt || certificate.createdAt).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }).toUpperCase()
          }
        })
        
        // Read the generated PDF file
        const fullPath = path.join(process.cwd(), 'public', pdfPath)
        const pdfBuffer = fs.readFileSync(fullPath)
        
        // Create safe filename
        const sanitizedName = certificate.recipientName.replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `${sanitizedName}_${certificate.uniqueCode}.pdf`
        
        // Add to ZIP
        archive.append(pdfBuffer, { name: filename })
        console.log(`  ✓ Added ${filename} to ZIP (${pdfBuffer.length} bytes)`)
        
        // Handle server storage
        if (saveToServer) {
          // Update certificate with file path and status
          await prisma.certificate.update({
            where: { id: certificate.id },
            data: {
              filePath: pdfPath,
              status: 'READY',
              issuedAt: certificate.issuedAt || new Date()
            }
          })
          console.log(`  ✓ Updated certificate ${certificate.id} status to READY`)
        } else {
          // Delete the temporary file if not saving to server
          try {
            fs.unlinkSync(fullPath)
            console.log(`  ✓ Deleted temporary file ${fullPath}`)
          } catch (err) {
            console.error('  ✗ Error deleting temp file:', err)
          }
        }
        
        results.push({
          id: certificate.id,
          recipientName: certificate.recipientName,
          success: true
        })
        
      } catch (error) {
        console.error(`Error generating PDF for certificate ${certificate.id}:`, error)
        results.push({
          id: certificate.id,
          recipientName: certificate.recipientName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Check if at least one certificate was successful
    const successfulCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length
    
    console.log(`\n=== Generation Summary ===`)
    console.log(`Total: ${results.length}`)
    console.log(`Successful: ${successfulCount}`)
    console.log(`Failed: ${failedCount}`)
    console.log(`=========================\n`)
    
    if (successfulCount === 0) {
      // All certificates failed - return error with details
      return NextResponse.json(
        { 
          error: 'All certificates failed to generate',
          details: results,
          totalCertificates: certificates.length,
          successful: 0,
          failed: failedCount
        },
        { status: 500 }
      )
    }
    
    // Add metadata file
    const metadata = {
      generated: new Date().toISOString(),
      totalCertificates: certificates.length,
      successful: successfulCount,
      failed: failedCount,
      savedToServer: saveToServer,
      results
    }
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })
    
    // Finalize archive
    console.log('Finalizing archive...')
    archive.finalize()
    
    // Wait for archive to complete
    await archivePromise
    
    // Combine chunks into single buffer
    console.log(`Total chunks collected: ${chunks.length}, total bytes: ${chunks.reduce((sum, c) => sum + c.length, 0)}`)
    const zipBuffer = Buffer.concat(chunks)
    console.log(`Final ZIP buffer size: ${zipBuffer.length} bytes`)
    
    // Return ZIP file
    console.log('Returning ZIP file to client...')
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="certificates-bulk-${Date.now()}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Total-Certificates': certificates.length.toString(),
        'X-Successful-Count': successfulCount.toString(),
        'X-Failed-Count': failedCount.toString()
      }
    })
    
  } catch (error) {
    console.error('Bulk PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDFs' },
      { status: 500 }
    )
  }
}
