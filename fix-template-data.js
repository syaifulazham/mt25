/**
 * Comprehensive fix script for certificate template properties
 * - Ensures text_anchor properties are correctly set based on style.align
 * - Ensures prefix properties exist for dynamic text elements
 * - Works for all templates in the database
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateData() {
  try {
    // Get all templates
    const templates = await prisma.certTemplate.findMany();
    
    console.log(`Processing ${templates.length} templates...`);
    
    // Process each template
    for (const template of templates) {
      console.log(`\nTemplate ID ${template.id}: ${template.templateName}`);
      
      if (!template.configuration || !template.configuration.elements) {
        console.log(`  No elements found in template.`);
        continue;
      }
      
      const elements = template.configuration.elements;
      let needsUpdate = false;
      
      // Process each element in the template
      const updatedElements = elements.map(element => {
        const originalElement = JSON.stringify(element);
        
        // For text elements, ensure all required properties exist
        if (element.type === 'dynamic_text' || element.type === 'static_text') {
          // Add or fix text_anchor based on style.align
          if (!element.text_anchor || element.text_anchor === 'start') {
            if (element.style?.align === 'center') {
              element.text_anchor = 'middle';
              needsUpdate = true;
            } else if (element.style?.align === 'right') {
              element.text_anchor = 'end';
              needsUpdate = true;
            }
          }
          
          // Add prefix for dynamic text if missing
          if (element.type === 'dynamic_text' && element.prefix === undefined) {
            element.prefix = '';
            needsUpdate = true;
          }
        }
        
        // Log if element was changed
        const newElement = JSON.stringify(element);
        if (originalElement !== newElement) {
          console.log(`  - Updated element ${element.id} (${element.type}):`);
          console.log(`    text_anchor: ${element.text_anchor}`);
          if (element.type === 'dynamic_text') {
            console.log(`    prefix: "${element.prefix}"`);
          }
        }
        
        return element;
      });
      
      // Update template if changes were made
      if (needsUpdate) {
        console.log(`  Updating template ${template.id}...`);
        
        await prisma.certTemplate.update({
          where: { id: template.id },
          data: {
            configuration: {
              ...template.configuration,
              elements: updatedElements
            },
            updatedBy: 1 // Admin user ID
          }
        });
        
        console.log(`  Template ${template.id} updated successfully.`);
      } else {
        console.log(`  No updates needed for template ${template.id}.`);
      }
    }
    
    console.log('\nAll templates processed successfully.');
    
  } catch (error) {
    console.error('Error fixing template data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixTemplateData();
