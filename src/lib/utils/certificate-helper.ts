import { CertificateSerialService } from '@/lib/services/certificate-serial-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper functions for certificate operations
 */

/**
 * Create a certificate with auto-generated serial number
 * 
 * @param certificateData - Certificate data
 * @returns Promise<any> - Created certificate with serial number
 */
export async function createCertificateWithSerial(certificateData: {
  templateId: number;
  recipientName: string;
  recipientEmail?: string;
  recipientType: string;
  contingent_name?: string;
  team_name?: string;
  ic_number?: string;
  contestName?: string;
  awardTitle?: string;
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT';
  filePath?: string;
  status?: string;
  createdBy: number;
}) {
  // Generate unique code (existing logic)
  const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  // Generate serial number
  const serialNumber = await CertificateSerialService.generateSerialNumber(
    certificateData.templateId,
    certificateData.targetType,
    new Date().getFullYear()
  );

  // Create certificate with serial number
  const result = await prisma.$executeRaw`
    INSERT INTO certificate 
    (templateId, recipientName, recipientEmail, recipientType, 
     contingent_name, team_name, ic_number, contestName, awardTitle,
     uniqueCode, serialNumber, filePath, status, createdAt, updatedAt, createdBy)
    VALUES (
      ${certificateData.templateId},
      ${certificateData.recipientName},
      ${certificateData.recipientEmail || null},
      ${certificateData.recipientType},
      ${certificateData.contingent_name || null},
      ${certificateData.team_name || null},
      ${certificateData.ic_number || null},
      ${certificateData.contestName || null},
      ${certificateData.awardTitle || null},
      ${uniqueCode},
      ${serialNumber},
      ${certificateData.filePath || null},
      ${certificateData.status || 'DRAFT'},
      NOW(),
      NOW(),
      ${certificateData.createdBy}
    )
  `;

  // Get the created certificate
  const certificate = await prisma.$queryRaw`
    SELECT * FROM certificate 
    WHERE uniqueCode = ${uniqueCode}
    LIMIT 1
  ` as any[];

  return certificate[0];
}

/**
 * Batch create certificates with auto-generated serial numbers
 * 
 * @param certificates - Array of certificate data
 * @returns Promise<any[]> - Created certificates with serial numbers
 */
export async function batchCreateCertificatesWithSerial(
  certificates: Array<{
    templateId: number;
    recipientName: string;
    recipientEmail?: string;
    recipientType: string;
    contingent_name?: string;
    team_name?: string;
    ic_number?: string;
    contestName?: string;
    awardTitle?: string;
    targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT';
    filePath?: string;
    status?: string;
    createdBy: number;
  }>
) {
  const createdCertificates = [];

  for (const certData of certificates) {
    const certificate = await createCertificateWithSerial(certData);
    createdCertificates.push(certificate);
  }

  return createdCertificates;
}

/**
 * Get preview of next serial number for a template
 * 
 * @param templateId - Template ID
 * @param targetType - Certificate type
 * @returns Promise<string> - Next serial number preview
 */
export async function getNextSerialPreview(
  templateId: number,
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT'
): Promise<string> {
  return await CertificateSerialService.previewNextSerialNumber(
    templateId,
    targetType
  );
}

/**
 * Verify certificate by serial number
 * 
 * @param serialNumber - Serial number to verify
 * @returns Promise<any | null> - Certificate details or null if not found
 */
export async function verifyCertificateBySerial(serialNumber: string) {
  // Validate format first
  if (!CertificateSerialService.validateSerialNumber(serialNumber)) {
    return null;
  }

  return await CertificateSerialService.getCertificateBySerial(serialNumber);
}
