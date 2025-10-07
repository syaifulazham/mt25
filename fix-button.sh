#!/bin/bash

# Create a backup if it doesn't exist already
if [ ! -f src/app/organizer/certificates/_components/TemplateEditorFixed.tsx.bak3 ]; then
    cp src/app/organizer/certificates/_components/TemplateEditorFixed.tsx src/app/organizer/certificates/_components/TemplateEditorFixed.tsx.bak3
fi

# Add a fix button that can be clicked to repair text_anchor properties
cat > fix-button-code.js << 'EOF'
  // Function to fix text anchor properties in the elements
  const fixTextAnchorProperties = () => {
    const updatedElements = elements.map(element => {
      const updatedElement = {...element};
      
      // Ensure text_anchor is set based on style.align
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
    
    // Set success message
    setSuccess('Text anchor properties fixed! Try selecting an element now.');
    
    // Print debug info
    console.log('Fixed elements:', updatedElements);
  };

EOF

# Add the fix button function to the component
sed -i '' '/const handleCanvasClick = () => {/i \
  // Function to fix text anchor properties in the elements\
  const fixTextAnchorProperties = () => {\
    const updatedElements = elements.map(element => {\
      const updatedElement = {...element};\
      \
      // Ensure text_anchor is set based on style.align\
      if (element.type === '"'dynamic_text'"' || element.type === '"'static_text'"') {\
        // Update text_anchor based on style.align\
        if (element.style?.align === '"'center'"') {\
          updatedElement.text_anchor = '"'middle'"';\
        } else if (element.style?.align === '"'right'"') {\
          updatedElement.text_anchor = '"'end'"';\
        } else {\
          updatedElement.text_anchor = '"'start'"';\
        }\
        \
        // Ensure prefix exists for dynamic text\
        if (element.type === '"'dynamic_text'"' && updatedElement.prefix === undefined) {\
          updatedElement.prefix = '"''"';\
        }\
      }\
      \
      return updatedElement;\
    });\
    \
    // Update state with fixed elements\
    setElements(updatedElements);\
    \
    // Set success message\
    setSuccess('"'Text anchor properties fixed! Try selecting an element now.'"');\
    \
    // Print debug info\
    console.log('"'Fixed elements:'"', updatedElements);\
  };\
' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

# Add the fix button to the debug UI
sed -i '' '/Debug {debugMode ? '"'ON'"' : '"'OFF'"'}</span>/a \
              </button>\
              \
              {/* Fix Text Anchor button */}\
              <button\
                type="button"\
                onClick={() => fixTextAnchorProperties()}\
                className="mr-2 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center space-x-1"\
                title="Fix Text Anchor Properties"\
              >\
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">\
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />\
                </svg>\
                <span>Fix Alignment</span>' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

echo "Added Fix Text Anchor button to the component. Restart the server to use it."
