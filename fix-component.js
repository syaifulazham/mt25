/**
 * Script to fix the text_anchor issue in the template editor component
 * This adds a function to ensure the properties are preserved
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
const backupPath = `${filePath}.backup2`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, content);
  console.log('Backup created');
}

// Find where to insert the fix function
const componentStartRegex = /export function TemplateEditor\(\{ template, session, isNew = false \}: TemplateEditorProps\) \{/;
const componentStartMatch = content.match(componentStartRegex);

if (!componentStartMatch) {
  console.error('Could not find component start');
  process.exit(1);
}

// Create the fix function
const fixFunction = `
  // Function to fix text anchor properties in the elements
  const fixElementProperties = () => {
    const updatedElements = elements.map(element => {
      const updatedElement = {...element};
      
      // Fix text elements
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Update text_anchor based on style.align
        if (element.style?.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
    
    // Update state with fixed elements
    setElements(updatedElements);
    console.log('Fixed elements with proper text_anchor and prefix values');
    setSuccess('Text properties fixed!');
  };
`;

// Insert the fix function after the component start
content = content.replace(
  componentStartRegex,
  `export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {${fixFunction}`
);

// Find the elements initialization
const elementsInitRegex = /const \[elements, setElements\] = useState<Element\[\]>\(template\?\.configuration\?\.elements \|\| \[\]\)/;
const elementsInitMatch = content.match(elementsInitRegex);

if (elementsInitMatch) {
  // Replace with code that fixes elements on init
  const fixedInit = `const [elements, setElements] = useState<Element[]>(() => {
    const rawElements = template?.configuration?.elements || [];
    // Auto-fix elements on load
    return rawElements.map(el => {
      const element = {...el};
      
      // Fix text elements
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Set text_anchor based on style.align
        if (element.style?.align === 'center') {
          element.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          element.text_anchor = 'end';
        } else {
          element.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && element.prefix === undefined) {
          element.prefix = '';
        }
      }
      
      return element;
    });
  })`;
  
  content = content.replace(elementsInitRegex, fixedInit);
  console.log('Fixed elements initialization');
}

// Add a fix button to the component
const fixButtonCode = `
              {/* Fix text anchor properties button */}
              <button
                type="button"
                onClick={fixElementProperties}
                className="mr-2 px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center space-x-1"
                title="Fix Text Properties"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Fix Text Props</span>
              </button>
`;

// Find a good place to insert the button
const insertButtonRegex = /<div className="flex space-x-2 items-center">/;
if (content.match(insertButtonRegex)) {
  content = content.replace(insertButtonRegex, 
    `<div className="flex space-x-2 items-center">
              ${fixButtonCode}`);
  console.log('Added fix button to component');
}

// Write the changes
fs.writeFileSync(filePath, content);
console.log('Component fixed successfully');
