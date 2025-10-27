import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';
import { PrismaClient } from '@prisma/client';
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';
import path from 'path';
import fs from 'fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';

const prisma = new PrismaClient();

/**
 * POST /api/participants/contestants/[id]/generate-certificate
 * Generate a GENERAL certificate for a contestant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json(
        { error: 'Invalid contestant ID' },
        { status: 400 }
      );
    }

    console.log('Fetching contestant:', contestantId);
    
    // Fetch contestant details
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          include: {
            school: true,
            higherInstitution: true,
            independent: true
          }
        }
      }
    });

    if (!contestant) {
      console.log('Contestant not found:', contestantId);
      return NextResponse.json(
        { error: 'Contestant not found' },
        { status: 404 }
      );
    }

    console.log('Contestant found:', contestant.name);
    console.log('Looking for GENERAL template...');
    
    // Find an active GENERAL certificate template
    const template = await prisma.certTemplate.findFirst({
      where: {
        targetType: 'GENERAL',
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!template) {
      console.log('No GENERAL template found');
      return NextResponse.json(
        { error: 'No active GENERAL certificate template found' },
        { status: 404 }
      );
    }

    console.log('Template found:', template.id, template.templateName);

    // Get institution name
    let institutionName = '';
    if (contestant.contingent.school) {
      institutionName = contestant.contingent.school.name;
    } else if (contestant.contingent.higherInstitution) {
      institutionName = contestant.contingent.higherInstitution.name;
    } else if (contestant.contingent.independent) {
      institutionName = contestant.contingent.independent.name;
    }

    // Check if certificate already exists for this IC number + template
    const existingCertResult = await prisma.$queryRaw`
      SELECT * FROM certificate 
      WHERE ic_number = ${contestant.ic}
        AND templateId = ${template.id}
      LIMIT 1
    ` as any[];
    
    let certificate;
    let isUpdate = false;
    
    if (existingCertResult.length > 0) {
      // Certificate exists - update it
      certificate = existingCertResult[0];
      isUpdate = true;
      
      console.log('Certificate already exists for IC:', contestant.ic);
      console.log('Updating existing certificate:', {
        id: certificate.id,
        uniqueCode: certificate.uniqueCode,
        serialNumber: certificate.serialNumber
      });
      
      // Update certificate details (keeping uniqueCode and serialNumber)
      await prisma.$executeRaw`
        UPDATE certificate 
        SET recipientName = ${contestant.name},
            contingent_name = ${contestant.contingent.name},
            recipientType = 'PARTICIPANT',
            status = 'DRAFT',
            updatedAt = NOW()
        WHERE id = ${certificate.id}
      `;
      
      console.log('Certificate updated successfully');
    } else {
      // Certificate doesn't exist - create new one
      console.log('Creating new certificate for IC:', contestant.ic);
      
      // Generate unique code (same format as organizer certificates)
      const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      console.log('Generated uniqueCode:', uniqueCode);

      // Generate serial number using CertificateSerialService
      console.log('Generating serial number...');
      const serialNumber = await CertificateSerialService.generateSerialNumber(
        template.id,
        'GENERAL',
        new Date().getFullYear()
      );
      console.log('Generated serialNumber:', serialNumber);

      // Handle createdBy for participant-generated certificates
      const createdByUserId = null; // NULL for participant-generated certificates
      
      console.log('Participant-generated certificate (createdBy: NULL)');

      // Create certificate record using raw SQL
      await prisma.$executeRaw`
        INSERT INTO certificate 
        (templateId, recipientName, recipientEmail, recipientType, 
         contingent_name, team_name, ic_number, contestName, awardTitle,
         uniqueCode, serialNumber, status, createdAt, updatedAt, createdBy)
        VALUES (
          ${template.id},
          ${contestant.name},
          ${null},
          'PARTICIPANT',
          ${contestant.contingent.name},
          ${null},
          ${contestant.ic || null},
          ${null},
          ${null},
          ${uniqueCode},
          ${serialNumber},
          'DRAFT',
          NOW(),
          NOW(),
          ${createdByUserId}
        )
      `;

      // Get the created certificate
      const certificateResult = await prisma.$queryRaw`
        SELECT * FROM certificate 
        WHERE uniqueCode = ${uniqueCode}
        LIMIT 1
      ` as any[];
      
      certificate = certificateResult[0];
      console.log('Certificate created:', {
        id: certificate.id,
        recipientName: certificate.recipientName,
        contingentName: certificate.contingent_name,
        uniqueCode: certificate.uniqueCode,
        serialNumber: certificate.serialNumber
      });
    }

    // Extract values from certificate for PDF generation
    const uniqueCode = certificate.uniqueCode;
    const serialNumber = certificate.serialNumber;
    console.log(`Certificate ${isUpdate ? 'updated' : 'created'} - uniqueCode: ${uniqueCode}, serialNumber: ${serialNumber}`);

    // Generate PDF
    console.log('Starting PDF generation...');
    const config = template.configuration as any;
    
    // Load base PDF
    const basePdfPath = path.join(process.cwd(), 'public', template.basePdfPath!.replace(/^\//, ''));
    const pdfBytes = await fs.readFile(basePdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();

    // Load fonts
    const font = await pdfDoc.embedFont('Helvetica');
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');

    // Get calibration settings
    const calibration = config.calibration || {
      scaleX: 1,
      scaleY: 1,
      offsetY: 0,
      baselineRatio: 0.35
    };

    // Data mapping function
    const replacePlaceholder = (key: string): string => {
      // Remove {{ and }} from placeholder if present
      const cleanKey = key.replace(/^\{\{|\}\}$/g, '').trim();
      
      // Helper function to remove 'contingent' word from contingent name
      const cleanContingentName = (name: string): string => {
        return name.replace(/\bcontingent\b/gi, '').trim();
      };
      
      const dataMap: Record<string, string> = {
        'recipient_name': contestant.name,
        'ic_number': contestant.ic || '',
        'contingent_name': cleanContingentName(contestant.contingent.name),
        'institution_name': institutionName,
        'issue_date': new Date().toLocaleDateString(),
        'unique_code': uniqueCode,
        'serial_number': serialNumber || '',
        'contest_name': '' // Template uses this but we don't have it for GENERAL certs
      };
      
      // Convert to uppercase for formal certificate appearance
      const value = dataMap[cleanKey] || '';
      return value.toUpperCase();
    };

    // Draw elements on PDF
    console.log('Processing', config.elements.length, 'template elements...');
    
    for (const element of config.elements) {
      try {
        let text = '';
        
        if (element.type === 'static_text') {
          text = element.content || '';
        } else if (element.type === 'dynamic_text' && element.placeholder) {
          const value = replacePlaceholder(element.placeholder);
          text = (element.prefix || '') + value;
          console.log(`  Placeholder: ${element.placeholder} → Value: "${value}" → Text: "${text}"`);
        }

        if (!text) {
          console.log(`  Skipping empty element`);
          continue;
        }

        const fontFamily = element.style?.font_family || 'Arial';
        const fontSize = parseFloat(element.style?.font_size) || 16;
        const color = element.style?.color || '#000000';
        const fontWeight = element.style?.font_weight || 'normal';
        
        const selectedFont = fontWeight === 'bold' ? fontBold : font;

        let fontSpecificOffset = 0;
        if (fontFamily.toLowerCase().includes('georgia')) {
          fontSpecificOffset = fontSize * 0.05;
        } else if (fontFamily.toLowerCase().includes('times')) {
          fontSpecificOffset = fontSize * 0.03;
        }
        
        let x = element.position.x * calibration.scaleX;
        let y = height - (element.position.y * calibration.scaleY + calibration.offsetY);
        
        const textWidth = selectedFont.widthOfTextAtSize(text, fontSize);
        
        if (element.text_anchor === 'middle') {
          x -= textWidth / 2;
        } else if (element.text_anchor === 'end') {
          x -= textWidth;
        }
        
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;

        const baselineOffset = (fontSize * calibration.baselineRatio) + fontSpecificOffset;
        const adjustedY = y - baselineOffset;
        const adjustedY_final = fontSize > 30 ? adjustedY + (fontSize * 0.02) : adjustedY;

        firstPage.drawText(text, {
          x,
          y: adjustedY_final,
          size: fontSize,
          font: selectedFont,
          color: rgb(r, g, b),
        });
      } catch (elementError) {
        console.error(`Error processing element ${element.id}:`, elementError);
      }
    }

    // Save PDF
    const modifiedPdfBytes = await pdfDoc.save();
    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'certificates');
    
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    const filename = `cert-${uniqueCode}.pdf`;
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, modifiedPdfBytes);
    console.log('PDF saved to:', outputPath);

    const filePath = `/uploads/certificates/${filename}`;

    // Update certificate record using raw SQL
    await prisma.$executeRaw`
      UPDATE certificate 
      SET filePath = ${filePath},
          status = 'READY',
          issuedAt = NOW(),
          updatedAt = NOW()
      WHERE id = ${certificate.id}
    `;

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        uniqueCode,
        serialNumber,
        filePath,
        status: 'READY'
      },
      isUpdate,
      message: isUpdate 
        ? 'Certificate updated and regenerated successfully' 
        : 'Certificate generated successfully'
    });

  } catch (error: any) {
    console.error('Error generating certificate:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate certificate',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
