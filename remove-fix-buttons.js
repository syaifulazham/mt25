/**
 * Script to remove the fix buttons from the template editor component
 */
const fs = require('fs');
const path = require('path');

// File path
const filePath = path.join(__dirname, 'src/app/organizer/certificates/_components/TemplateEditorFixed.tsx');

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Create backup if it doesn't exist
const backupPath = `${filePath}.no-buttons`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, content);
  console.log('Backup created');
}

// Pattern to find and remove "Fix Text Props" button
const fixTextPropsRegex = /\s*{\/\* Fix text anchor properties button \*\/}\s*<button[\s\S]*?<\/button>\s*/;
if (content.match(fixTextPropsRegex)) {
  content = content.replace(fixTextPropsRegex, '\n');
  console.log('Removed "Fix Text Props" button');
} else {
  console.log('Could not find "Fix Text Props" button');
}

// Pattern to find and remove "Fix Alignment" button
const fixAlignmentRegex = /\s*{\/\* Fix Text Anchor button \*\/}\s*<button[\s\S]*?<\/button>\s*/;
if (content.match(fixAlignmentRegex)) {
  content = content.replace(fixAlignmentRegex, '\n');
  console.log('Removed "Fix Alignment" button');
} else {
  console.log('Could not find "Fix Alignment" button');
}

// Try another pattern for "Fix Alignment" button (it might have different markup)
const fixAlignmentRegex2 = /\s*<button\s*type="button"\s*onClick={\(\) => (fixTextAnchorProperties|setElements\(ensureElementProperties\(elements\)\))}\s*className="mr-2 px-3 py-1.5 bg-(red|orange)-500[\s\S]*?Fix (Alignment|Text Props)<\/span>\s*<\/button>\s*/g;
if (content.match(fixAlignmentRegex2)) {
  content = content.replace(fixAlignmentRegex2, '\n');
  console.log('Removed "Fix Alignment" button with alternate pattern');
} else {
  console.log('Could not find "Fix Alignment" button with alternate pattern');
}

// Write the changes
fs.writeFileSync(filePath, content);
console.log('Buttons removed successfully');
