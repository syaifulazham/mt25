import nodemailer from 'nodemailer';

// Configure nodemailer with SMTP settings
export const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || undefined,
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

export interface SendTokenEmailOptions {
  to: string;
  token: string;
  eventName?: string;
}

export const sendTokenEmail = async ({ to, token, eventName }: SendTokenEmailOptions): Promise<boolean> => {
  try {
    const subject = `Malaysia Techlympics 2025 - Token Pendaftaran Pasukan Tambahan`;
    
    // Create HTML email with the token in large text
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Malaysia Techlympics 2025</h2>
        
        <p>Berikut adalah token untuk pendaftaran pasukan:</p>
        
        <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
          <p style="font-size: 24pt; font-weight: bold; letter-spacing: 2px; color: #333;">${token}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <p><strong>Token ini boleh digunakan untuk mendaftarkan pasukan tambahan.</strong></p>
          <p><strong>Satu token hanya boleh digunakan untuk satu penambahan pasukan sahaja.</strong></p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #555; font-size: 14px;">Malaysia Techlympics 2025</p>
          <p style="color: #555; font-size: 14px;">Luar Biasa, Global, Inclusif</p>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            Ini adalah email yang dijana secara automatik. Sila jangan balas email ini.
            Sekiranya anda mempunyai sebarang pertanyaan, sila hubungi penganjur acara.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@malaysiatechlympics.com',
      to,
      subject,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
