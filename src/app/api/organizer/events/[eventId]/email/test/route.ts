import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ms as locale } from 'date-fns/locale';
import crypto from 'crypto';

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

// Generate random 12 character alphanumeric string
function generateRandomCode() {
  return crypto.randomBytes(6).toString('hex'); // 6 bytes = 12 hex characters
}

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
async function generateEmailContent(manager: any, event: any, testQrCode: string): Promise<string> {
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
            .test-email { background-color: #ffe0e0; padding: 10px; margin-bottom: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Maklumat Pendaftaran Acara</h2>
            </div>
            
            <div class="test-email">
              <strong>EMEL UJIAN</strong> - QR Code: ${testQrCode}
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
              
              <p>Sebarang pertanyaan, sila hubungi pihak penganjur.</p>
              
              <p>Terima kasih.</p>
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
    console.log('Starting test email process...');
    const eventId = params.eventId;
    
    // Parse request body
    const { email } = await request.json();
    
    if (!email) {
      return new NextResponse(JSON.stringify({
        error: true,
        message: 'Email address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Get event details
      const event = await prisma.event.findUnique({
        where: { id: parseInt(eventId) },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          venue: true,
          address: true,
          city: true,
          state: {
            select: {
              name: true
            }
          }
        }
      });

      if (!event) {
        return new NextResponse(JSON.stringify({
          error: true,
          message: 'Event not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Generate random code for test QR code
      const randomCode = generateRandomCode();
      
      // Create mock manager data for test email
      const mockManager = {
        id: 0,
        name: 'Test Recipient',
        contingentName: 'Test Contingent',
        email: email,
        hashcode: randomCode,
        eventName: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        address: event.address,
        city: event.city,
        addressState: event.state?.name || ''
      };
      
      try {
        // Generate QR code as buffer
        const qrCodeBuffer = await generateQRCode(randomCode);
        
        // Generate email content with CID reference for QR code
        const emailContent = await generateEmailContent(mockManager, mockManager, randomCode);
        
        // Send email with QR code attachment
        const info = await transporter.sendMail({
          from: `"Techlympics" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `[TEST EMAIL] Malaysia Techlympics 2025 - ${event.name}`,
          html: emailContent,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrCodeBuffer,
              cid: 'qrcode' // same cid value as in the img src in HTML
            }
          ]
        });
        
        console.log('Test email sent:', info.messageId);
        
        // Return success response
        return new NextResponse(JSON.stringify({
          success: true,
          message: 'Test email sent successfully',
          messageId: info.messageId,
          qrCode: randomCode
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (emailError: any) {
        console.error('Error sending test email:', emailError);
        return new NextResponse(JSON.stringify({
          error: true,
          message: 'Error sending test email',
          details: emailError.message || 'Unknown error sending email',
          stack: process.env.NODE_ENV === 'development' ? emailError?.stack : undefined
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
    console.error('Error in test email endpoint:', error);
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
