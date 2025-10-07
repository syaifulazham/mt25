const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to diagnose and fix issues with text_anchor and prefix properties 
 * in certificate template elements
 */
async function diagnoseTemplateElements() {
  try {
    // Get all templates
    const templates = await prisma.certTemplate.findMany();
    
    console.log(`Examining ${templates.length} templates...`);
    
    for (const template of templates) {
      console.log(`\nTemplate ID ${template.id}: ${template.templateName}`);
      
      if (!template.configuration || !template.configuration.elements) {
        console.log(`  No elements found in template.`);
        continue;
      }
      
      const elements = template.configuration.elements;
      console.log(`  Found ${elements.length} elements.`);
      
      let needsUpdate = false;
      let updatedElements = elements.map(element => {
        const originalElement = { ...element };
        let elementUpdated = false;
        
        if (element.type === 'dynamic_text' || element.type === 'static_text') {
          // Check text_anchor property
          if (!element.text_anchor) {
            element.text_anchor = element.style?.align === 'center' ? 'middle' : 
                                  element.style?.align === 'right' ? 'end' : 'start';
            console.log(`  - Added text_anchor: '${element.text_anchor}' to element ${element.id}`);
            elementUpdated = true;
          }
          
          // Check prefix property for dynamic text
          if (element.type === 'dynamic_text' && element.prefix === undefined) {
            element.prefix = '';
            console.log(`  - Added empty prefix to dynamic text element ${element.id}`);
            elementUpdated = true;
          }
        }
        
        if (elementUpdated) {
          needsUpdate = true;
          console.log(`  - Updated element ${element.id}:`);
          console.log(`    Before:`, JSON.stringify(originalElement, null, 2));
          console.log(`    After:`, JSON.stringify(element, null, 2));
        }
        
        return element;
      });
      
      if (needsUpdate) {
        // Update the template configuration
        console.log(`  Updating template ${template.id}...`);
        
        const updatedConfiguration = {
          ...template.configuration,
          elements: updatedElements
        };
        
        await prisma.certTemplate.update({
          where: { id: template.id },
          data: {
            configuration: updatedConfiguration,
            updatedBy: 1 // Admin user ID
          }
        });
        
        console.log(`  Template ${template.id} updated successfully.`);
      } else {
        console.log(`  No updates needed for template ${template.id}.`);
      }
    }
    
    console.log('\nDiagnosis and updates completed.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseTemplateElements();
