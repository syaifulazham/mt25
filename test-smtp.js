const nodemailer = require('nodemailer');
require('dotenv').config();

// Log the SMTP configuration being used (without password)
console.log('Testing SMTP configuration:');
console.log(`- Service: ${process.env.SMTP_SERVICE}`);
console.log(`- Host: ${process.env.SMTP_HOST}`);
console.log(`- Port: ${process.env.SMTP_PORT}`);
console.log(`- Secure: ${process.env.SMTP_SECURE}`);
console.log(`- User: ${process.env.EMAIL_USER}`);
console.log('- Password: [hidden]');

// Create transporter with your SMTP configuration
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true // Enable debug output
});

// Test the connection
async function testConnection() {
  console.log('\nVerifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful! Server is ready to accept messages.');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// Send a test email
async function sendTestEmail() {
  console.log('\nAttempting to send test email...');
  
  // Where would you like to send the test email to?
  const testRecipient = process.env.EMAIL_USER; // Can be changed to any email address
  
  try {
    const info = await transporter.sendMail({
      from: `"SMTP Test" <${process.env.EMAIL_USER}>`,
      to: testRecipient,
      subject: "SMTP Test Email ✅",
      text: "This is a test email to verify your SMTP configuration is working correctly.",
      html: "<b>This is a test email to verify your SMTP configuration is working correctly.</b><p>If you're seeing this, your email setup is working!</p>"
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// Run the tests
async function runTests() {
  const connectionSuccessful = await testConnection();
  if (connectionSuccessful) {
    await sendTestEmail();
  }
}

runTests();
