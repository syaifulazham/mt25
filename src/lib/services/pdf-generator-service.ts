import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CertificateData {
  id: number;
  templateId: number;
  recipientName: string;
  uniqueCode: string;
  serialNumber: string | null;
  ic_number?: string | null;
  contingent_name?: string | null;
  team_name?: string | null;
  contestName?: string | null;
  awardTitle?: string | null;
  position?: string | null;
  achievement?: string | null;
}

interface TemplateConfig {
  elements: Array<{
    id: string;
    type: 'static_text' | 'dynamic_text';
    content?: string;
    placeholder?: string;
    prefix?: string;
    position: { x: number; y: number };
    text_anchor?: 'start' | 'middle' | 'end';
    style?: {
      font_family?: string;
      font_size?: string;
      font_weight?: string;
      color?: string;
    };
  }>;
  calibration?: {
    scaleX: number;
    scaleY: number;
    offsetY: number;
    baselineRatio: number;
  };
}

export class PDFGeneratorService {
  /**
   * Generate PDF certificate in-memory without saving to disk
   * @param certificateId - The certificate database record ID
   * @returns PDF as Uint8Array buffer
   */
  static async generateCertificatePDF(certificateId: number): Promise<Uint8Array> {
    try {
      // Fetch certificate with template
      const certificate = await prisma.certificate.findUnique({
        where: { id: certificateId },
        include: {
          template: true
        }
      });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      if (!certificate.template) {
        throw new Error('Certificate template not found');
      }

      if (!certificate.template.basePdfPath) {
        throw new Error('Template base PDF path not found');
      }

      // Generate PDF in memory
      return await this.generatePDFFromData(certificate as any, {
        basePdfPath: certificate.template.basePdfPath!,
        configuration: certificate.template.configuration
      });
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF from certificate data and template
   * @param certificate - Certificate data
   * @param template - Template configuration
   * @returns PDF as Uint8Array buffer
   */
  static async generatePDFFromData(
    certificate: CertificateData,
    template: { basePdfPath: string; configuration: any }
  ): Promise<Uint8Array> {
    try {
      const config = template.configuration as TemplateConfig;

      // Load base PDF
      const basePdfPath = path.join(
        process.cwd(),
        'public',
        template.basePdfPath.replace(/^\//, '')
      );
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
        const cleanKey = key.replace(/^\{\{|\}\}$/g, '').trim();

        // Helper function to clean contingent name
        const cleanContingentName = (name: string): string => {
          return name.replace(/\bcontingent\b/gi, '').trim();
        };

        const dataMap: Record<string, string> = {
          recipient_name: certificate.recipientName || '',
          ic_number: certificate.ic_number || '',
          contingent_name: certificate.contingent_name
            ? cleanContingentName(certificate.contingent_name)
            : '',
          team_name: certificate.team_name || '',
          contest_name: certificate.contestName || '',
          award_title: certificate.awardTitle || '',
          position: certificate.position || '',
          achievement: certificate.achievement || '',
          unique_code: certificate.uniqueCode || '',
          serial_number: certificate.serialNumber || '',
          issue_date: new Date().toLocaleDateString('en-MY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        };

        const value = dataMap[cleanKey] || '';
        return value.toUpperCase();
      };

      // Draw elements on PDF
      console.log(`Processing ${config.elements?.length || 0} template elements...`);

      if (config.elements && Array.isArray(config.elements)) {
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

            const fontFamily = element.style?.font_family || 'Arial';
            const fontSize = parseFloat(element.style?.font_size || '16');
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

            const baselineOffset = fontSize * calibration.baselineRatio + fontSpecificOffset;
            const adjustedY = y - baselineOffset;
            const adjustedY_final = fontSize > 30 ? adjustedY + fontSize * 0.02 : adjustedY;

            firstPage.drawText(text, {
              x,
              y: adjustedY_final,
              size: fontSize,
              font: selectedFont,
              color: rgb(r, g, b)
            });
          } catch (elementError) {
            console.error(`Error processing element ${element.id}:`, elementError);
          }
        }
      }

      // Return PDF as buffer (in-memory, no file save)
      const pdfBuffer = await pdfDoc.save();
      console.log(`PDF generated in-memory: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF from data:', error);
      throw error;
    }
  }

  /**
   * Generate filename for certificate
   * @param certificate - Certificate data
   * @param template - Template data
   * @returns Clean filename string
   */
  static generateFileName(
    certificate: { recipientName: string; uniqueCode: string },
    template: { templateName: string }
  ): string {
    const cleanTemplateName = template.templateName.replace(/[^a-z0-9]/gi, '_');
    const cleanRecipientName = certificate.recipientName.replace(/[^a-z0-9]/gi, '_');
    return `${cleanTemplateName}_${cleanRecipientName}_${certificate.uniqueCode}.pdf`;
  }
}
