// Script to add dynamic exports to all page and route files
const fs = require('fs');
const path = require('path');

// Dynamic export statement to add
const dynamicExportStatement = `
// Force dynamic rendering - fixed by add-dynamic-exports.js
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

`;

// Find all page.tsx and route.ts files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (
      file === 'page.tsx' || 
      file === 'route.ts' || 
      file === 'route.tsx' ||
      file === 'page.js' || 
      file === 'route.js'
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Add dynamic export statement to a file if it doesn't already have it
function addDynamicExport(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes("export const dynamic = 'force-dynamic'")) {
      console.log(`Skipping ${filePath} (already has dynamic export)`);
      return;
    }
    
    // Find a good insertion point - after imports or at the beginning
    let insertionPoint = 0;
    
    // Find the last import statement
    const importRegex = /^import .+ from .+;?\s*$/gm;
    let match;
    let lastImportEndIndex = 0;
    
    while ((match = importRegex.exec(content)) !== null) {
      lastImportEndIndex = match.index + match[0].length;
    }
    
    if (lastImportEndIndex > 0) {
      // If found imports, insert after the last import
      insertionPoint = lastImportEndIndex;
      // Add newline if needed
      if (!content.substring(insertionPoint).startsWith('\n\n')) {
        content = content.slice(0, insertionPoint) + '\n' + content.slice(insertionPoint);
        insertionPoint++;
      }
    }
    
    // Insert the dynamic export statement
    const newContent = 
      content.slice(0, insertionPoint) + 
      dynamicExportStatement + 
      content.slice(insertionPoint);
    
    fs.writeFileSync(filePath, newContent);
    console.log(`Added dynamic export to ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Main execution
console.log('Starting to add dynamic exports to page and route files...');
const appDir = path.join(__dirname, 'src', 'app');
const files = findFiles(appDir);

console.log(`Found ${files.length} page and route files`);
files.forEach(addDynamicExport);

console.log('Completed adding dynamic exports');
