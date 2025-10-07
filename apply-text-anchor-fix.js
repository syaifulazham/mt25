/**
 * Script to apply a targeted fix to TemplateEditorFixed.tsx
 * This adds our specific fix for the text_anchor property handling
 * without replacing the entire file.
 */
const fs = require('fs');
const path = require('path');

// File path
const filePath = path.join(__dirname, 'src/app/organizer/certificates/_components/TemplateEditorFixed.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Create backup if it doesn't exist
const backupPath = `${filePath}.orig`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, content);
  console.log('Backup created');
}

// Fix 1: Add a function to fix text_anchor properties right after the component declaration
const componentRegex = /export function TemplateEditor\({ template, session, isNew = false \}: TemplateEditorProps\) {/;
const fixFunction = `
  // Function to fix text anchor properties in the elements
  const ensureElementProperties = (elements) => {
    return elements.map(element => {
      // Deep clone the element
      const updatedElement = JSON.parse(JSON.stringify(element));
      
      // For text elements, ensure properties are properly set
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Set text_anchor based on style.align
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
  };`;

// Insert the fix function
content = content.replace(componentRegex, `export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {${fixFunction}`);

// Fix 2: Modify the state initialization to apply our fixes to the elements
const elementsStateRegex = /const \[elements, setElements\] = useState<Element\[\]>\(template\?\.configuration\?\.elements \|\| \[\]\)/;
const fixedElementsState = `const [elements, setElements] = useState<Element[]>(() => {
    // Apply our fixes to the initial elements
    const rawElements = template?.configuration?.elements || [];
    return ensureElementProperties(rawElements);
  })`;

// Replace the elements state initialization
content = content.replace(elementsStateRegex, fixedElementsState);

// Fix 3: Update the processLoadedElements function to use the new approach
const processLoadedRegex = /const processLoadedElements[^}]*};\s*\s*\/\/ Initialize elements state with processed elements/s;
const fixedProcessLoaded = `
  // Process elements when loading to ensure all required properties exist
  const processLoadedElements = (loadedElements: Element[] = []): Element[] => {
    // Simply delegate to our new helper function
    return ensureElementProperties(loadedElements);
  };
  
  // Initialize elements state with processed elements`;

if (processLoadedRegex.test(content)) {
  content = content.replace(processLoadedRegex, fixedProcessLoaded);
  console.log('processLoadedElements function replaced');
} else {
  console.log('Could not find processLoadedElements function to replace');
}

// Fix 4: Add debug button
const debugButtonRegex = /<span>Debug {debugMode \? 'ON' : 'OFF'}<\/span>/;
const fixButtonHtml = `<span>Debug {debugMode ? 'ON' : 'OFF'}</span>
              </button>
              
              {/* Fix Text Anchor button */}
              <button
                type="button"
                onClick={() => setElements(ensureElementProperties(elements))}
                className="mr-2 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center space-x-1"
                title="Fix Text Anchor Properties"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Fix Alignment</span>`;

// Add the fix button
content = content.replace(debugButtonRegex, fixButtonHtml);

// Write the modified content back to the file
fs.writeFileSync(filePath, content);
console.log('Applied text_anchor fix to TemplateEditorFixed.tsx');
