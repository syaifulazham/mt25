import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

// Allowed roles for certificate generation
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

/**
 * POST /api/certificates/[id]/generate
 * Generate PDF for a certificate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const certificateId = parseInt(params.id);

    if (isNaN(certificateId)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID' },
        { status: 400 }
      );
    }

    // Fetch certificate with template details
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        template: true
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    if (!certificate.template) {
      return NextResponse.json(
        { error: 'Certificate template not found' },
        { status: 404 }
      );
    }

    // Parse template configuration
    const config = typeof certificate.template.configuration === 'string'
      ? JSON.parse(certificate.template.configuration as string)
      : certificate.template.configuration;

    if (!config || !config.elements || !Array.isArray(config.elements)) {
      return NextResponse.json(
        { error: 'Invalid template configuration' },
        { status: 400 }
      );
    }

    // Get calibration settings from template configuration
    const calibration = config.calibration || {
      scaleX: 1,
      scaleY: 1,
      offsetY: 0,
      baselineRatio: 0.35
    };

    // Load the base PDF template
    const basePdfPath = certificate.template.basePdfPath;
    if (!basePdfPath) {
      return NextResponse.json(
        { error: 'Template PDF not found' },
        { status: 404 }
      );
    }

    // Read the PDF file
    const pdfPath = path.join(process.cwd(), 'public', basePdfPath);
    let pdfBytes;
    try {
      pdfBytes = await fs.readFile(pdfPath);
    } catch (err) {
      console.error('Error reading PDF file:', err);
      return NextResponse.json(
        { error: 'Failed to read template PDF file' },
        { status: 500 }
      );
    }

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Function to replace placeholders with certificate data
    const replacePlaceholder = (placeholder: string): string => {
      const key = placeholder.replace(/{{|}}/g, '').trim();
      
      const dataMap: Record<string, any> = {
        'recipient_name': certificate.recipientName,
        'recipient_email': certificate.recipientEmail || '',
        'award_title': certificate.awardTitle || '',
        'contingent_name': certificate.contingent_name || '',
        'team_name': certificate.team_name || '',
        'ic_number': certificate.ic_number || '',
        'contest_name': certificate.contestName || '',
        'issue_date': certificate.issuedAt 
          ? new Date(certificate.issuedAt).toLocaleDateString() 
          : new Date().toLocaleDateString(),
        'unique_code': certificate.uniqueCode || '',
        'serial_number': (certificate as any).serialNumber || ''
      };

      return dataMap[key] || '';
    };

    // Draw elements on the PDF
    for (const element of config.elements) {
      try {
        let text = '';
        
        if (element.type === 'static_text') {
          text = element.content || '';
        } else if (element.type === 'dynamic_text' && element.placeholder) {
          const value = replacePlaceholder(element.placeholder);
          text = (element.prefix || '') + value;
        }

        if (!text) continue;

        // Parse element styles
        const fontFamily = element.style?.font_family || 'Arial';
        const fontSize = parseFloat(element.style?.font_size) || 16;
        const color = element.style?.color || '#000000';
        const fontWeight = element.style?.font_weight || 'normal';
        
        // Select font based on weight
        const selectedFont = fontWeight === 'bold' ? fontBold : font;

        // Apply font-specific adjustments
        let fontSpecificOffset = 0;
        if (fontFamily.toLowerCase().includes('georgia')) {
          fontSpecificOffset = fontSize * 0.05; // Georgia needs slight adjustment
        } else if (fontFamily.toLowerCase().includes('times')) {
          fontSpecificOffset = fontSize * 0.03; // Times needs slight adjustment
        }
        
        // Apply calibration scale factor to X coordinate
        let x = element.position.x * calibration.scaleX;
        
        // Calculate Y position (flip coordinate system)
        // PDF coordinates start from bottom-left, web coordinates from top-left
        let y = height - (element.position.y * calibration.scaleY + calibration.offsetY);
        
        // Handle text alignment (text_anchor)
        const textWidth = selectedFont.widthOfTextAtSize(text, fontSize);
        
        // Apply alignment based on text_anchor
        if (element.text_anchor === 'middle') {
          // Center alignment
          x -= textWidth / 2;
        } else if (element.text_anchor === 'end') {
          // Right alignment
          x -= textWidth;
        }
        // Left alignment (default) - no adjustment needed
        
        // Convert hex color to RGB
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;

        // Adjust y position for font baseline
        // In PDFs, y coordinate is at the text baseline, not the top
        const baselineOffset = (fontSize * calibration.baselineRatio) + fontSpecificOffset;
        const adjustedY = y - baselineOffset;
        
        // For large font sizes, make additional proportional adjustment
        const adjustedY_final = fontSize > 30 ? adjustedY + (fontSize * 0.02) : adjustedY;

        // Draw text with adjusted coordinates
        firstPage.drawText(text, {
          x,
          y: adjustedY_final,
          size: fontSize,
          font: selectedFont,
          color: rgb(r, g, b),
        });
      } catch (elementError) {
        console.error(`Error processing element ${element.id}:`, elementError);
        // Continue with next element instead of failing the whole process
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'certificates');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      console.error('Error creating output directory:', err);
    }

    // Generate unique filename
    const filename = `cert-${certificate.id}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    const relativePath = `/uploads/certificates/${filename}`;

    // Write the PDF file
    await fs.writeFile(outputPath, modifiedPdfBytes);

    // Update certificate record with file path and status
    const updatedCertificate = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        filePath: relativePath,
        status: 'READY',
        issuedAt: certificate.issuedAt || new Date(),
        updatedAt: new Date()
      },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
            targetType: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate generated successfully',
      certificate: updatedCertificate,
      filePath: relativePath
    });

  } catch (error) {
    console.error('Failed to generate certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
