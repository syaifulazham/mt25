const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

/**
 * Script to diagnose text_anchor issues in template elements
 */
async function diagnoseTextAnchorIssues() {
  try {
    // Get the template
    const template = await prisma.certTemplate.findUnique({
      where: { id: 1 }
    });
    
    if (!template) {
      console.log('Template not found');
      return;
    }
    
    console.log('=============== DATABASE VALUES ===============');
    console.log('Template raw configuration:', JSON.stringify(template.configuration, null, 2));
    
    // Create debug output for all elements
    const elements = template.configuration.elements || [];
    console.log(`\nFound ${elements.length} elements in template ${template.id}:`);
    
    elements.forEach(element => {
      console.log(`\nElement ID: ${element.id}`);
      console.log(`Type: ${element.type}`);
      console.log(`Text Anchor: ${JSON.stringify(element.text_anchor)}`); // Stringify to show undefined/null clearly
      console.log(`Text Anchor Type: ${typeof element.text_anchor}`);
      console.log(`Prefix: ${JSON.stringify(element.prefix)}`);
      console.log(`Prefix Type: ${typeof element.prefix}`);
      
      if (element.style) {
        console.log(`Style.align: ${element.style.align}`);
        console.log(`Style Properties: ${Object.keys(element.style).join(', ')}`);
      } else {
        console.log('No style object found');
      }
    });
    
    // Create a modified version of the template to explicitly set text_anchor
    const updatedElements = elements.map(element => {
      // Deep clone the element
      const updatedElement = JSON.parse(JSON.stringify(element));
      
      // Ensure text_anchor is correctly set based on style.align
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Force text_anchor based on style.align
        if (element.style && element.style.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style && element.style.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix is set for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
    
    // Update template with the fixed elements
    const updatedConfiguration = {
      ...template.configuration,
      elements: updatedElements
    };
    
    // Write the updated configuration to a file for inspection
    fs.writeFileSync('template-fixed-config.json', JSON.stringify(updatedConfiguration, null, 2));
    
    // Update the template in the database
    const updatedTemplate = await prisma.certTemplate.update({
      where: { id: 1 },
      data: {
        configuration: updatedConfiguration,
        updatedBy: 1 // Admin user ID
      }
    });
    
    console.log('\n=============== TEMPLATE UPDATED ===============');
    console.log('Template updated with fixed text_anchor values. Check browser console logs after reload.');
    console.log('A backup of the fixed configuration has been saved to template-fixed-config.json');
    
    // Generate temporary debug helper file
    const debugHelperJs = `
// Paste this in browser console when viewing the template editor
(function() {
  // Helper to check element properties in browser
  function debugTemplateElements() {
    const elements = document.querySelectorAll('.element');
    console.log('Found ' + elements.length + ' elements in DOM');
    
    // Try to access elements from React state
    console.log('REACT STATE INSPECTION:');
    console.log('If you see any error below, ignore it. This is just an attempt to access React state.');
    
    // Attempt to find React instance
    let reactInstance = null;
    for (const key in window) {
      if (key.startsWith('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
        reactInstance = key;
        break;
      }
    }
    
    console.log('React instance found: ' + (reactInstance !== null));
    
    console.log('=============== MANUAL CHECK ===============');
    console.log('Please click on each element in the editor and check if the text alignment controls show the correct state.');
    console.log('When you click an element, note if the left/center/right alignment buttons show the correct active state.');
  }
  
  // Execute the debug function
  debugTemplateElements();
})();
`;

    fs.writeFileSync('template-debug-helper.js', debugHelperJs);
    console.log('Debug helper script written to template-debug-helper.js');
    console.log('Copy the contents and paste in browser console when viewing the template editor');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseTextAnchorIssues();
