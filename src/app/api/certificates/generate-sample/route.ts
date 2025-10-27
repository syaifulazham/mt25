import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
// We'll use standard fonts instead of fontkit to avoid compatibility issues
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth-options';

// Allowed roles for generating sample certificates
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR'];

/**
 * API endpoint to generate a sample certificate with background PDF
 * This performs the generation server-side to avoid browser security restrictions
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    // Parse the request body
    const { elements, pdfUrl, mockupData, paperSize, calibration } = await request.json();
    
    if (!elements || !pdfUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Default to A4 Landscape if no paper size is provided
    const certificateSize = paperSize || { width: 842, height: 595 };
    
    // Default calibration values if not provided
    const calibrationSettings = calibration || {
      scaleX: 1,
      scaleY: 1,
      offsetY: 0,
      baselineRatio: 0.35
    };

    console.log('Processing PDF URL:', pdfUrl);
    
    // There are multiple ways the file could be stored, try all possibilities
    let pdfPath = '';
    let pdfExists = false;
    
    // Option 1: File in public directory with leading slash
    if (pdfUrl.startsWith('/')) {
      const relativePdfPath = pdfUrl.substring(1);
      const publicDir = path.join(process.cwd(), 'public');
      pdfPath = path.join(publicDir, relativePdfPath);
      pdfExists = fs.existsSync(pdfPath);
      console.log('Checking public directory (relative):', pdfPath, pdfExists ? 'FOUND' : 'NOT FOUND');
    }
    
    // Option 2: File in public directory without leading slash
    if (!pdfExists) {
      const publicDir = path.join(process.cwd(), 'public');
      pdfPath = path.join(publicDir, pdfUrl);
      pdfExists = fs.existsSync(pdfPath);
      console.log('Checking public directory (direct):', pdfPath, pdfExists ? 'FOUND' : 'NOT FOUND');
    }
    
    // Option 3: File in uploads directory
    if (!pdfExists && pdfUrl.includes('uploads')) {
      const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
      const fileName = pdfUrl.split('/').pop();
      // Try to find the file by name in the uploads directory
      if (fileName && fs.existsSync(uploadsPath)) {
        const files = fs.readdirSync(uploadsPath, { recursive: true });
        for (const file of files) {
          if (typeof file === 'string' && file.endsWith(fileName)) {
            pdfPath = path.join(uploadsPath, file);
            pdfExists = fs.existsSync(pdfPath);
            if (pdfExists) {
              console.log('Found file in uploads directory by name:', pdfPath);
              break;
            }
          }
        }
      }
    }
    
    // Option 4: Fall back to test certificate if not found
    if (!pdfExists) {
      const testPdfPath = path.join(process.cwd(), 'public', 'uploads', 'templates', 'test-certificate-background.pdf');
      if (fs.existsSync(testPdfPath)) {
        pdfPath = testPdfPath;
        pdfExists = true;
        console.log('Using test certificate background as fallback:', pdfPath);
      }
    }
    
    // Check if the PDF exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF background file not found' },
        { status: 404 }
      );
    }

    // Read the PDF file
    const pdfBytes = fs.readFileSync(pdfPath);
    
    try {
      console.log('Loading PDF document from path:', pdfPath);
      console.log('Using certificate size:', certificateSize);

      // Create a new PDF with the specified paper size
      const newPdfDoc = await PDFDocument.create();
      
      // Create a blank page with the specified dimensions
      let certificatePage = newPdfDoc.addPage([certificateSize.width, certificateSize.height]);
      console.log('Created new PDF with page size:', { width: certificateSize.width, height: certificateSize.height });
      
      // Load the background PDF to extract content
      const backgroundPdf = await PDFDocument.load(pdfBytes);
      const backgroundPages = backgroundPdf.getPages();
      if (backgroundPages.length === 0) {
        throw new Error('Background PDF has no pages');
      }
      
      // Try to add the background content if available
      try {
        // Get background dimensions
        const { width: bgWidth, height: bgHeight } = backgroundPages[0].getSize();
        
        // Copy the background page
        const [embeddedBackgroundPage] = await newPdfDoc.embedPages([backgroundPages[0]]);
        
        // Calculate scale factors to fit background into our page size
        const scaleX = certificateSize.width / bgWidth;
        const scaleY = certificateSize.height / bgHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Center the background image if it doesn't match our target dimensions
        const xOffset = (certificateSize.width - (bgWidth * scale)) / 2;
        const yOffset = (certificateSize.height - (bgHeight * scale)) / 2;
        
        // Draw the background onto our certificate page
        certificatePage.drawPage(embeddedBackgroundPage, {
          x: xOffset,
          y: yOffset,
          width: bgWidth * scale,
          height: bgHeight * scale,
        });
        
        console.log('Added background PDF content with dimensions:', { 
          certificateWidth: certificateSize.width, 
          certificateHeight: certificateSize.height, 
          bgWidth, 
          bgHeight,
          scale,
          xOffset,
          yOffset
        });
      } catch (copyError) {
        console.error('Error embedding background PDF:', copyError);
        // Continue without background if copying fails
      }
      
      // Use the dimensions from our certificate page
      const { width, height } = certificatePage.getSize();
      console.log('PDF page size:', { width, height });
      
      // Use the calibration settings provided by the user
      const calibration = {
        // Scale factors for element positioning
        scaleX: calibrationSettings.scaleX,
        scaleY: calibrationSettings.scaleY,
        // Additional offsets
        offsetX: 0, // No horizontal offset needed for now
        offsetY: calibrationSettings.offsetY,
        // Font baseline adjustment
        baselineRatio: calibrationSettings.baselineRatio,
      };
      
      console.log('Using calibration factors:', calibration);
      
      // Load standard fonts - no need for fontkit
      const helvetica = await newPdfDoc.embedFont('Helvetica');
      const helveticaBold = await newPdfDoc.embedFont('Helvetica-Bold');
      const timesRoman = await newPdfDoc.embedFont('Times-Roman');
      const timesBold = await newPdfDoc.embedFont('Times-Bold');
      
      // Simple font mapping from common web fonts to PDF standard fonts
      const fontMap: Record<string, any> = {
        'Arial': helvetica,
        'Helvetica': helvetica,
        'Times New Roman': timesRoman,
        'Times': timesRoman,
        'Georgia': timesRoman,
      };

      // Weight mapping function
      const getFontForWeight = (family: string, weight: string) => {
        const normalizedFamily = family?.toLowerCase() || '';
        const isBold = weight?.toLowerCase() === 'bold';
        
        if (isBold) {
          if (normalizedFamily.includes('arial') || normalizedFamily.includes('helvetica')) {
            return helveticaBold;
          } else if (normalizedFamily.includes('times') || normalizedFamily.includes('georgia')) {
            return timesBold;
          }
        }
        
        // Default fonts based on family
        if (normalizedFamily.includes('times') || normalizedFamily.includes('georgia')) {
          return timesRoman;
        }
        
        // Default to Helvetica
        return helvetica;
      };
      
      console.log('Successfully embedded standard fonts');

      // Function to replace placeholders with actual data
      const replacePlaceholder = (placeholder: string): string => {
        const key = placeholder.replace(/{{|}}/g, '');
        return mockupData[key] || placeholder;
      };

      console.log('Adding text elements to the certificate page...');
      // Add text elements to the certificate page
      for (const element of elements) {
        try {
          if (element.type === 'static_text' || element.type === 'dynamic_text') {
            // Log element being processed
            console.log(`Processing ${element.type} element:`, {
              id: element.id,
              position: element.position,
              text_anchor: element.text_anchor,
              style: element.style
            });
            
            // Get font and size
            const fontFamily = element.style?.font_family || 'Arial';
            const fontSize = parseFloat(element.style?.font_size) || 16;
            const fontWeight = element.style?.font_weight || 'normal';
            const font = getFontForWeight(fontFamily, fontWeight);
            
            // Apply font-specific adjustments
            let fontSpecificOffset = 0;
            if (fontFamily.toLowerCase().includes('georgia')) {
              fontSpecificOffset = fontSize * 0.05; // Georgia needs slight adjustment
            } else if (fontFamily.toLowerCase().includes('times')) {
              fontSpecificOffset = fontSize * 0.03; // Times needs slight adjustment
            }
            
            // Get text content
            let text: string;
            if (element.type === 'static_text') {
              text = element.content || '';
            } else {
              // Dynamic text with placeholder
              const prefix = element.prefix || '';
              const placeholderValue = replacePlaceholder(element.placeholder || '');
              text = prefix + placeholderValue;
            }
            console.log(`Text content: "${text}"`);
            
            // Get position - need to convert coordinates correctly
            // The editor uses top-left origin, PDF uses bottom-left origin
            
            // Apply calibration scale factor to coordinates
            let x = element.position.x * calibration.scaleX + calibration.offsetX;
            
            // Calculate Y position (flip coordinate system)
            // PDF coordinates start from bottom-left, web coordinates from top-left
            let y = height - (element.position.y * calibration.scaleY + calibration.offsetY);
            
            console.log(`Original position in editor: x=${element.position.x}, y=${element.position.y}`);
            console.log(`After calibration and flipping Y: x=${x}, y=${y}`);
            
            // Handle text alignment (text_anchor)
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            // Apply alignment based on text_anchor
            if (element.text_anchor === 'middle') {
              // Center alignment
              console.log(`Center alignment: text width = ${textWidth}`);
              x -= textWidth / 2;
              console.log(`Adjusted x for center alignment: ${x}`);
            } else if (element.text_anchor === 'end') {
              // Right alignment
              console.log(`Right alignment: text width = ${textWidth}`);
              x -= textWidth;
              console.log(`Adjusted x for right alignment: ${x}`);
            } else {
              // Left alignment (default) - no adjustment needed
              console.log('Left alignment: no x adjustment');
            }
            
            // Get color
            const color = element.style?.color || '#000000';
            // Handle potential color format issues
            let r = 0, g = 0, b = 0;
            try {
              if (color.startsWith('#') && color.length >= 7) {
                r = parseInt(color.substring(1, 3), 16) / 255;
                g = parseInt(color.substring(3, 5), 16) / 255;
                b = parseInt(color.substring(5, 7), 16) / 255;
              }
            } catch (colorError) {
              console.error('Error parsing color:', colorError);
              // Use black as fallback
              r = g = b = 0;
            }
            
            console.log(`Drawing text at position x=${x}, y=${y} with fontSize=${fontSize}`);
            // Adjust y position for font baseline
            // In PDFs, y coordinate is at the text baseline, not the top
            // We need to add an offset based on font size to position text correctly
            const baselineOffset = (fontSize * calibration.baselineRatio) + fontSpecificOffset;
            const adjustedY = y - baselineOffset;
            
            // For large font sizes, make additional proportional adjustment
            const adjustedY_final = fontSize > 30 ? adjustedY + (fontSize * 0.02) : adjustedY;
            
            console.log(`Font size: ${fontSize}, baseline offset: ${baselineOffset}`);
            console.log(`Final text position: x=${x}, y=${adjustedY_final}`);
            
            // Draw text with adjusted coordinates
            certificatePage.drawText(text, {
              x,
              y: adjustedY_final,
              size: fontSize,
              font,
              color: rgb(r, g, b),
            });
          }
        } catch (elementError) {
          console.error(`Error processing element ${element.id}:`, elementError);
          // Continue with next element instead of failing the whole process
        }
      }
      
      console.log('Saving PDF document...');
      // Save the PDF
      const modifiedPdfBytes = await newPdfDoc.save();
      
      // Return the PDF as a base64 encoded string
      const base64Pdf = Buffer.from(modifiedPdfBytes).toString('base64');
      console.log('PDF successfully generated with size:', base64Pdf.length);
      
      return NextResponse.json({
        pdf: base64Pdf,
        filename: `certificate-sample-${new Date().toISOString().slice(0, 10)}.pdf`
      });
    } catch (processingError) {
      console.error('Error in PDF processing:', processingError);
      throw processingError; // Re-throw to be caught by the outer try-catch
    }
    
  } catch (error) {
    console.error('Error generating sample certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate sample certificate' },
      { status: 500 }
    );
  }
}
