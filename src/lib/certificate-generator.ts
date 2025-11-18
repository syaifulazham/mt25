import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CertificateData {
  recipient_name: string;
  recipient_email?: string;
  award_title?: string;
  contingent_name?: string;
  team_name?: string;
  ic_number?: string;
  contest_name?: string;
  issue_date?: string;
  unique_code?: string;
  serial_number?: string;
  institution_name?: string;
}

interface TemplateConfig {
  id: number;
  basePdfPath: string;
  configuration: any;
}

/**
 * Generate a certificate PDF from template and data
 * 
 * @param template - Template configuration with basePdfPath and configuration
 * @param data - Certificate data to populate
 * @returns Promise<string> - Relative path to generated PDF
 */
export async function generateCertificatePDF(options: {
  template: TemplateConfig;
  data: CertificateData;
}): Promise<string> {
  const { template, data } = options;

  // Parse template configuration
  const config = typeof template.configuration === 'string'
    ? JSON.parse(template.configuration)
    : template.configuration;

  if (!config || !config.elements || !Array.isArray(config.elements)) {
    throw new Error('Invalid template configuration');
  }

  // Get calibration settings from template configuration
  const calibration = config.calibration || {
    scaleX: 1,
    scaleY: 1,
    offsetY: 0,
    baselineRatio: 0.35
  };

  // Load the base PDF template
  const basePdfPath = template.basePdfPath;
  if (!basePdfPath) {
    throw new Error('Template PDF not found');
  }

  // Read the PDF file
  const pdfPath = path.join(process.cwd(), 'public', basePdfPath);
  let pdfBytes;
  try {
    pdfBytes = await fs.readFile(pdfPath);
  } catch (err) {
    console.error('Error reading PDF file:', err);
    throw new Error('Failed to read template PDF file');
  }

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  // Embed standard fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Function to replace placeholders with certificate data
  const replacePlaceholder = (placeholder: string): string => {
    const key = placeholder.replace(/{{|}}/g, '').trim();
    
    // Helper function to remove 'contingent' word from contingent name
    const cleanContingentName = (name: string): string => {
      return name.replace(/\bcontingent\b/gi, '').trim();
    };
    
    const dataMap: Record<string, any> = {
      'recipient_name': data.recipient_name ? data.recipient_name.toUpperCase() : '',
      'recipient_email': data.recipient_email ? data.recipient_email.toUpperCase() : '',
      'award_title': data.award_title ? data.award_title.toUpperCase() : '',
      'contingent_name': data.contingent_name ? cleanContingentName(data.contingent_name).toUpperCase() : '',
      'team_name': data.team_name ? data.team_name.toUpperCase() : '',
      'ic_number': data.ic_number ? data.ic_number.toUpperCase() : '',
      'contest_name': data.contest_name ? data.contest_name.toUpperCase() : '',
      'issue_date': data.issue_date ? data.issue_date.toUpperCase() : new Date().toLocaleDateString().toUpperCase(),
      'unique_code': data.unique_code ? data.unique_code.toUpperCase() : '',
      'serial_number': data.serial_number ? data.serial_number.toUpperCase() : '',
      'institution_name': data.institution_name ? data.institution_name.toUpperCase() : ''
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
        fontSpecificOffset = fontSize * 0.05;
      } else if (fontFamily.toLowerCase().includes('times')) {
        fontSpecificOffset = fontSize * 0.03;
      }
      
      // Apply calibration scale factor to X coordinate
      let x = element.position.x * calibration.scaleX;
      
      // Calculate Y position (flip coordinate system)
      let y = height - (element.position.y * calibration.scaleY + calibration.offsetY);
      
      // Handle text alignment
      const textWidth = selectedFont.widthOfTextAtSize(text, fontSize);
      
      if (element.text_anchor === 'middle') {
        x -= textWidth / 2;
      } else if (element.text_anchor === 'end') {
        x -= textWidth;
      }
      
      // Convert hex color to RGB
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      // Adjust y position for font baseline
      const baselineOffset = (fontSize * calibration.baselineRatio) + fontSpecificOffset;
      const adjustedY = y - baselineOffset;
      const adjustedY_final = fontSize > 30 ? adjustedY + (fontSize * 0.02) : adjustedY;

      // Draw text
      firstPage.drawText(text, {
        x,
        y: adjustedY_final,
        size: fontSize,
        font: selectedFont,
        color: rgb(r, g, b),
      });
    } catch (elementError) {
      console.error(`Error processing element ${element.id}:`, elementError);
      // Continue with next element
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
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const filename = `cert-${template.id}-${timestamp}-${random}.pdf`;
  const outputPath = path.join(outputDir, filename);
  const relativePath = `/uploads/certificates/${filename}`;

  // Write the PDF file with explicit flush to ensure immediate availability
  try {
    await fs.writeFile(outputPath, modifiedPdfBytes, { flag: 'w' });
    
    // Ensure file is flushed to disk before proceeding
    const fileHandle = await fs.open(outputPath, 'r+');
    await fileHandle.sync(); // Force flush to disk
    await fileHandle.close();
    
    // Small delay to ensure file system has updated
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (err) {
    console.error('Error writing PDF file:', err);
    throw new Error('Failed to write certificate PDF');
  }

  return relativePath;
}
