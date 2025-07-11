import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ms as locale } from 'date-fns/locale';

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate QR Code as buffer for file attachment
async function generateQRCode(hashcode: string): Promise<Buffer> {
  try {
    return await QRCode.toBuffer(hashcode, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Generate email content with QR Code (using CID reference)
async function generateEmailContent(manager: any, event: any): Promise<string> {
  try {
    // Format dates using Malaysian locale
    const startDate = format(new Date(event.startDate), 'dd MMMM yyyy', { locale });
    const endDate = format(new Date(event.endDate), 'dd MMMM yyyy', { locale });
    
    // Email content in Malay with CID reference for QR code
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 15px; text-align: center; }
            .content { padding: 20px 0; }
            .footer { font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
            .qr-code { text-align: center; padding: 20px 0; }
            .qr-code img { width: 200px; height: 200px; }
            .event-details { background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #4285f4; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Maklumat Pendaftaran Acara</h2>
            </div>
            
            <div class="content">
              <p>Assalamualaikum, Salam Sejahtera, Salam Malaysia Madani, Salam Techlympics</p>
              <p>Tuan/ Puan ${manager.name},</p>
              
              <p>Tahniah! Kontinjen ${manager.contingentName} telah berjaya didaftarkan untuk menyertai:</p>
              
              <div class="event-details">
                <h1>MALAYSIA TECHLYMPICS 2025</h1>
                <h3>${event.eventName}</h3>
                <p><strong>Tarikh:</strong> ${startDate} hingga ${endDate}</p>
                <p><strong>Tempat:</strong> ${event.venue || 'Akan dimaklumkan'}</p>
                <p><strong>Alamat:</strong> ${event.address || ''} ${event.city || ''} ${event.addressState || ''}</p>
              </div>
              
              <p>Sila gunakan kod QR di bawah semasa pendaftaran kehadiran di kaunter pendaftaran:</p>
              
              <div class="qr-code">
                <img src="cid:qrcode" alt="QR Code Pendaftaran" />
              </div>

              <p>Jumpa kami di sana</p>
              
              <p>Sebarang pertanyaan, sila hubungi pihak penganjur.</p>
              
              <p>Terima kasih.</p>
              <p>Luar Biasa, Global, Inklusif</p>
            </div>
            
            <div class="footer">
              <p>Nota: Ini adalah emel yang dijana secara automatik. Sila jangan balas emel ini.</p>
              <p>© ${new Date().getFullYear()} Techlympics. Hakcipta Terpelihara.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  } catch (error) {
    console.error('Error generating email content:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    console.log('Starting debug email send process...');
    
    // Parse and log all inputs
    const eventId = params.eventId;
    console.log('EventId:', eventId);
    
    // Attempt to parse body
    let body = {};
    try {
      body = await request.json();
      console.log('Request body parsed successfully:', body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
    }

    // Try a basic Prisma query
    try {
      console.log('Attempting basic Prisma query...');
      const event = await prisma.event.findUnique({
        where: {
          id: parseInt(eventId)
        },
        select: {
          id: true,
          name: true
        }
      });
      
      console.log('Prisma query result:', event);
      
      // Now try to fetch manager data
      console.log('Fetching manager data...');
      const { managerIds } = body as any;
      
      if (!managerIds || !Array.isArray(managerIds)) {
        return new NextResponse(JSON.stringify({
          success: true,
          message: 'Event found but no valid manager IDs provided',
          eventData: event
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Use raw SQL query instead of Prisma query builder
      console.log('Using raw SQL query for manager data');
      
      try {
        // Use a simpler approach with direct SQL
        const sql = `
          SELECT 
            am.id,
            am.email,
            am.hashcode,
            m.name,
            am.contingentId,
            e.name as eventName,
            e.startDate,
            e.endDate,
            e.venue,
            e.address,
            e.city,
            s2.name as addressState,
            CASE 
              WHEN c.contingentType = 'SCHOOL' THEN s.name
              WHEN c.contingentType = 'HIGHER_INSTITUTION' THEN hi.name
              WHEN c.contingentType = 'INDEPENDENT' THEN i.name
              ELSE 'Unknown'
            END as contingentName
          FROM 
            attendanceManager am
          JOIN 
            manager m ON am.managerId = m.id
          JOIN 
            contingent c ON am.contingentId = c.id
          JOIN
            event e ON am.eventId = e.id
          LEFT JOIN
            state s2 ON e.stateId = s2.id
          LEFT JOIN 
            school s ON c.schoolId = s.id
          LEFT JOIN 
            higherinstitution hi ON c.higherInstId = hi.id
          LEFT JOIN 
            independent i ON c.independentId = i.id
          WHERE 
            am.eventId = ?
            AND am.id IN (${managerIds.map(() => '?').join(',')})
        `;
        
        const managers = await prisma.$queryRawUnsafe(
          sql, 
          parseInt(eventId), 
          ...managerIds
        ) as any[];
        
        console.log('Raw SQL query results:', managers);
        
        // Process and send emails to managers
        const emailResults = [];
        
        for (const manager of managers) {
          try {
            // Skip managers without email
            if (!manager.email) {
              emailResults.push({
                managerId: manager.id,
                success: false,
                error: 'No email address available'
              });
              continue;
            }
            
            // Generate QR code as buffer
            const qrCodeBuffer = await generateQRCode(manager.hashcode);
            
            // Generate email content with CID reference for QR code
            const emailContent = await generateEmailContent(manager, manager); // event data is included in manager from our SQL
            
            // Send email with QR code attachment
            const info = await transporter.sendMail({
              from: `"Techlympics" <${process.env.EMAIL_USER}>`,
              to: manager.email,
              subject: `Malaysia Techlympics 2025 - ${manager.eventName}`,
              html: emailContent,
              attachments: [
                {
                  filename: 'qrcode.png',
                  content: qrCodeBuffer,
                  cid: 'qrcode' // same cid value as in the img src in HTML
                }
              ]
            });
            
            console.log('Email sent:', info.messageId);
            
            // Update manager email_status
            await prisma.$executeRawUnsafe(
              'UPDATE attendanceManager SET email_status = ? WHERE id = ?',
              'SENT',
              manager.id
            );
            
            emailResults.push({
              managerId: manager.id,
              success: true,
              messageId: info.messageId
            });
          } catch (emailError: any) {
            console.error(`Error sending email to manager ${manager.id}:`, emailError);
            
            // Update manager email_status
            await prisma.$executeRawUnsafe(
              'UPDATE attendanceManager SET email_status = ? WHERE id = ?',
              'ERROR',
              manager.id
            );
            
            emailResults.push({
              managerId: manager.id,
              success: false,
              error: emailError.message || 'Unknown error sending email'
            });
          }
        }
        
        // Return success with email sending results
        return new NextResponse(JSON.stringify({
          success: true,
          message: 'Emails processed',
          emailResults,
          managersCount: managers.length,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (sqlError: any) {
        console.error('SQL query error:', sqlError);
        return new NextResponse(JSON.stringify({
          error: true,
          message: 'SQL query error',
          details: sqlError?.message || 'Unknown SQL error',
          stack: process.env.NODE_ENV === 'development' ? sqlError?.stack : undefined
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return new NextResponse(JSON.stringify({
        error: true,
        message: 'Database error',
        details: dbError?.message || 'Unknown database error',
        stack: process.env.NODE_ENV === 'development' ? dbError?.stack : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }



  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    console.error('Stack trace:', error?.stack);
    
    return new NextResponse(JSON.stringify({
      error: true,
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
