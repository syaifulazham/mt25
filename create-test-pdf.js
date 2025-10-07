const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPdf() {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Add a blank page to the document
    const page = pdfDoc.addPage([842, 595]); // A4 size in points (landscape)
    
    // Add some basic content to the page
    page.drawText('TEST CERTIFICATE BACKGROUND', {
      x: 50,
      y: 500,
      size: 30,
    });
    
    // Draw a border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: 802,
      height: 555,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Save the PDF document
    const pdfBytes = await pdfDoc.save();
    
    // Write the PDF to a file - only use test names that won't conflict with real certificates
    const outputPath = path.join(__dirname, 'public', 'uploads', 'templates', 'test-certificate-background.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`Test PDF created at: ${outputPath}`);
    
  } catch (error) {
    console.error('Error creating test PDF:', error);
  }
}

createTestPdf();
