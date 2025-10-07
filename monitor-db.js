const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitorDb() {
  try {
    // Get all templates
    const templates = await prisma.$queryRaw`
      SELECT id, templateName, configuration 
      FROM cert_template 
      WHERE id = 1
    `;
    
    if (templates && templates.length > 0) {
      const template = templates[0];
      console.log(`Template ID: ${template.id}, Name: ${template.templateName}`);
      
      // MySQL returns JSON as a string, so we need to parse it
      const config = typeof template.configuration === 'string' 
        ? JSON.parse(template.configuration) 
        : template.configuration;
      
      console.log('\nRaw configuration from database:');
      console.log(JSON.stringify(config, null, 2));
      
      // Check for elements
      if (config && config.elements) {
        config.elements.forEach((element, index) => {
          console.log(`\nElement ${index + 1} (${element.id}):`);
          console.log(`  type: ${element.type}`);
          console.log(`  text_anchor: ${element.text_anchor}`);
          console.log(`  prefix: ${element.prefix}`);
          console.log(`  style.align: ${element.style?.align}`);
        });
      }
    } else {
      console.log('No templates found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

monitorDb();
