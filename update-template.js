const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplate() {
  try {
    // Get the current template
    const template = await prisma.certTemplate.findUnique({
      where: { id: 1 }
    });

    if (!template) {
      console.log('Template not found');
      return;
    }

    // Create a deep copy of configuration
    const configuration = JSON.parse(JSON.stringify(template.configuration));

    // Update all elements with missing properties
    if (configuration.elements) {
      configuration.elements = configuration.elements.map(element => {
        if (element.type === 'dynamic_text') {
          // Add missing text_anchor based on style.align
          if (!element.text_anchor) {
            if (element.style?.align === 'center') {
              element.text_anchor = 'middle';
            } else if (element.style?.align === 'right') {
              element.text_anchor = 'end';
            } else {
              element.text_anchor = 'start';
            }
          }
          
          // Add missing prefix if it doesn't exist
          if (element.prefix === undefined) {
            element.prefix = '';
          }
        }
        return element;
      });

      console.log('Updated elements:');
      configuration.elements.forEach(el => {
        console.log(`\nElement ID: ${el.id}`);
        console.log(`Type: ${el.type}`);
        console.log(`Text Anchor: ${el.text_anchor || 'Not set'}`);
        console.log(`Prefix: ${el.prefix !== undefined ? `"${el.prefix}"` : 'Not set'}`);
        console.log(`Style.align: ${el.style?.align || 'Not set'}`);
      });
    }

    // Update the template in the database
    const updatedTemplate = await prisma.certTemplate.update({
      where: { id: 1 },
      data: {
        configuration,
        updatedBy: 1  // Using admin ID 1
      }
    });

    console.log('\nTemplate updated successfully!');
    
  } catch (error) {
    console.error('Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplate();
