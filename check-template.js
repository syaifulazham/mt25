const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    // Get the template with ID 1
    const template = await prisma.certTemplate.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        templateName: true,
        configuration: true
      }
    });

    console.log('Template ID 1:');
    console.log(JSON.stringify(template, null, 2));
    
    // Extract and display the elements
    if (template?.configuration?.elements) {
      console.log('\nElements:');
      template.configuration.elements.forEach(el => {
        console.log(`\nElement ID: ${el.id}`);
        console.log(`Type: ${el.type}`);
        console.log(`Text Anchor: ${el.text_anchor || 'Not set'}`);
        console.log(`Prefix: ${el.prefix !== undefined ? `"${el.prefix}"` : 'Not set'}`);
        console.log(`Style.align: ${el.style?.align || 'Not set'}`);
      });
    }
  } catch (error) {
    console.error('Error checking template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
