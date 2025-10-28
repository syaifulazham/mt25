import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type for certificate target types
type CertTargetType = 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER';

/**
 * Certificate Serial Number Service
 * Handles generation and management of unique serial numbers for certificates
 */
export class CertificateSerialService {
  private static readonly PREFIX = 'MT'; // Malaysia Techlympics
  
  private static readonly TYPE_CODE_MAP: Record<string, string> = {
    'GENERAL': 'GEN',
    'EVENT_PARTICIPANT': 'PART',
    'EVENT_WINNER': 'WIN',
    'NON_CONTEST_PARTICIPANT': 'NCP',
    'QUIZ_PARTICIPANT': 'QPART',
    'QUIZ_WINNER': 'QWIN'
  };

  /**
   * Generate next serial number for a certificate
   * Format: MT25/GEN/T5/000001 (includes template ID)
   * 
   * Uses database transaction to ensure uniqueness and prevent race conditions
   * 
   * @param templateId - Certificate template ID
   * @param targetType - Type of certificate
   * @param issueYear - Year of issuance (defaults to current year)
   * @returns Promise<string> - Generated serial number
   */
  static async generateSerialNumber(
    templateId: number,
    targetType: CertTargetType,
    issueYear?: number
  ): Promise<string> {
    const year = issueYear || new Date().getFullYear();
    const typeCode = this.TYPE_CODE_MAP[targetType];

    if (!typeCode) {
      throw new Error(`Invalid target type: ${targetType}`);
    }

    // Use transaction to ensure atomic increment
    return await prisma.$transaction(async (tx) => {
      // Get or create serial record for this year/type/template combination
      // Use FOR UPDATE to lock the row and prevent concurrent updates
      let serialRecord = await tx.$queryRaw`
        SELECT id, lastSequence 
        FROM certificate_serial 
        WHERE year = ${year} 
          AND templateId = ${templateId} 
          AND targetType = ${targetType}
        FOR UPDATE
      ` as any[];

      let nextSequence: number;

      if (serialRecord.length === 0) {
        // Create new serial record starting at 1
        await tx.$executeRaw`
          INSERT INTO certificate_serial 
          (year, templateId, targetType, typeCode, lastSequence, createdAt, updatedAt)
          VALUES (${year}, ${templateId}, ${targetType}, ${typeCode}, 1, NOW(), NOW())
        `;
        nextSequence = 1;
      } else {
        // Increment existing sequence
        nextSequence = Number(serialRecord[0].lastSequence) + 1;
        await tx.$executeRaw`
          UPDATE certificate_serial
          SET lastSequence = ${nextSequence},
              updatedAt = NOW()
          WHERE id = ${serialRecord[0].id}
        `;
      }

      // Format: MT25/GEN/T5/000001 (includes template ID)
      const yearShort = String(year).slice(-2); // Last 2 digits of year
      const paddedSequence = String(nextSequence).padStart(6, '0');
      return `${this.PREFIX}${yearShort}/${typeCode}/T${templateId}/${paddedSequence}`;
    });
  }

  /**
   * Get current sequence number for a type/year combination
   * 
   * @param templateId - Certificate template ID
   * @param targetType - Type of certificate
   * @param year - Year to check (defaults to current year)
   * @returns Promise<number> - Current sequence number (0 if not started)
   */
  static async getCurrentSequence(
    templateId: number,
    targetType: CertTargetType,
    year?: number
  ): Promise<number> {
    const currentYear = year || new Date().getFullYear();
    
    const result = await prisma.$queryRaw`
      SELECT lastSequence 
      FROM certificate_serial 
      WHERE year = ${currentYear} 
        AND templateId = ${templateId}
        AND targetType = ${targetType}
    ` as any[];

    return result.length > 0 ? Number(result[0].lastSequence) : 0;
  }

  /**
   * Get statistics for serial number generation
   * Shows how many certificates have been issued for each type
   * 
   * @param year - Year to get stats for (defaults to current year)
   * @returns Promise<any[]> - Statistics for each certificate type
   */
  static async getSerialStats(year?: number) {
    const currentYear = year || new Date().getFullYear();
    
    return await prisma.$queryRaw`
      SELECT 
        cs.year,
        cs.targetType,
        cs.typeCode,
        cs.lastSequence,
        ct.templateName,
        COUNT(c.id) as certificatesIssued
      FROM certificate_serial cs
      LEFT JOIN cert_template ct ON cs.templateId = ct.id
      LEFT JOIN certificate c ON c.serialNumber LIKE CONCAT('${this.PREFIX}-', cs.year, '-', cs.typeCode, '-%')
      WHERE cs.year = ${currentYear}
      GROUP BY cs.id, cs.year, cs.targetType, cs.typeCode, cs.lastSequence, ct.templateName
      ORDER BY cs.year DESC, cs.targetType
    ` as any[];
  }

  /**
   * Get all serial number records for a specific template
   * 
   * @param templateId - Certificate template ID
   * @returns Promise<any[]> - All serial records for the template
   */
  static async getTemplateSerials(templateId: number) {
    return await prisma.$queryRaw`
      SELECT 
        id,
        year,
        targetType,
        typeCode,
        lastSequence,
        createdAt,
        updatedAt
      FROM certificate_serial
      WHERE templateId = ${templateId}
      ORDER BY year DESC, targetType
    ` as any[];
  }

  /**
   * Validate serial number format
   * 
   * @param serialNumber - Serial number to validate
   * @returns boolean - True if valid format
   */
  static validateSerialNumber(serialNumber: string): boolean {
    // Format: MT25/GEN/T5/000001 (includes template ID)
    const pattern = new RegExp(`^${this.PREFIX}\\d{2}/(GEN|PART|WIN|NCP|QPART|QWIN)/T\\d+/\\d{6}$`);
    return pattern.test(serialNumber);
  }

  /**
   * Parse serial number to extract components
   * 
   * @param serialNumber - Serial number to parse
   * @returns object | null - Parsed components or null if invalid
   */
  static parseSerialNumber(serialNumber: string) {
    // Format: MT25/GEN/T5/000001 (includes template ID)
    const parts = serialNumber.split('/');
    if (parts.length !== 4) return null;

    // Extract prefix and year from first part (e.g., "MT25")
    const prefixYear = parts[0];
    const prefix = prefixYear.slice(0, -2); // "MT"
    const yearShort = prefixYear.slice(-2); // "25"
    const fullYear = 2000 + parseInt(yearShort); // 2025

    // Extract template ID from third part (e.g., "T5" -> 5)
    const templateIdPart = parts[2];
    const templateId = templateIdPart.startsWith('T') ? parseInt(templateIdPart.slice(1)) : null;

    const sequence = parseInt(parts[3]);

    if (isNaN(fullYear) || isNaN(sequence) || templateId === null || isNaN(templateId)) return null;

    return {
      prefix: prefix,
      year: fullYear,
      yearShort: yearShort,
      typeCode: parts[1],
      templateId: templateId,
      sequence: sequence
    };
  }

  /**
   * Check if a serial number exists in the database
   * 
   * @param serialNumber - Serial number to check
   * @returns Promise<boolean> - True if exists
   */
  static async serialNumberExists(serialNumber: string): Promise<boolean> {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM certificate
      WHERE serialNumber = ${serialNumber}
    ` as any[];

    return Number(result[0]?.count || 0) > 0;
  }

  /**
   * Get certificate by serial number
   * 
   * @param serialNumber - Serial number to search for
   * @returns Promise<any | null> - Certificate record or null
   */
  static async getCertificateBySerial(serialNumber: string) {
    const result = await prisma.$queryRaw`
      SELECT 
        c.*,
        ct.templateName,
        ct.targetType
      FROM certificate c
      LEFT JOIN cert_template ct ON c.templateId = ct.id
      WHERE c.serialNumber = ${serialNumber}
      LIMIT 1
    ` as any[];

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Reset sequence for a specific year/type/template combination
   * WARNING: Use with caution - this will reset the counter
   * 
   * @param templateId - Certificate template ID
   * @param targetType - Type of certificate
   * @param year - Year to reset
   * @returns Promise<void>
   */
  static async resetSequence(
    templateId: number,
    targetType: CertTargetType,
    year: number
  ): Promise<void> {
    await prisma.$executeRaw`
      UPDATE certificate_serial
      SET lastSequence = 0,
          updatedAt = NOW()
      WHERE year = ${year}
        AND templateId = ${templateId}
        AND targetType = ${targetType}
    `;
  }

  /**
   * Get next serial number that would be generated (without actually generating it)
   * Useful for preview purposes
   * 
   * @param templateId - Certificate template ID
   * @param targetType - Type of certificate
   * @param issueYear - Year of issuance (defaults to current year)
   * @returns Promise<string> - Next serial number
   */
  static async previewNextSerialNumber(
    templateId: number,
    targetType: CertTargetType,
    issueYear?: number
  ): Promise<string> {
    const year = issueYear || new Date().getFullYear();
    const typeCode = this.TYPE_CODE_MAP[targetType];
    
    const currentSequence = await this.getCurrentSequence(templateId, targetType, year);
    const nextSequence = currentSequence + 1;
    
    const yearShort = String(year).slice(-2);
    const paddedSequence = String(nextSequence).padStart(6, '0');
    return `${this.PREFIX}${yearShort}/${typeCode}/T${templateId}/${paddedSequence}`;
  }
}
