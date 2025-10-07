#!/bin/bash

# Create a backup if it doesn't exist already
if [ ! -f src/app/organizer/certificates/_components/TemplateEditorFixed.tsx.bak2 ]; then
    cp src/app/organizer/certificates/_components/TemplateEditorFixed.tsx src/app/organizer/certificates/_components/TemplateEditorFixed.tsx.bak2
fi

# Create a function to add debug logs for text_anchor
cat > debug-render.js << 'EOF'
// Debug function to inspect element properties when rendering
function debugElementProps(element, location) {
  console.log(`Rendering element ${element.id} at ${location} with text_anchor: '${element.text_anchor}' (${typeof element.text_anchor})`);
  return element.text_anchor;
}
EOF

# Add a helper function to the component using sed
sed -i '' '/export function TemplateEditor/i \
// Debug function to inspect element properties when rendering\
function debugElementProps(element, location) {\
  console.log(`Rendering element ${element.id} at ${location} with text_anchor: "${element.text_anchor}" (${typeof element.text_anchor})`)\
  return element.text_anchor\
}' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

# Find and modify the text_anchor usage
sed -i '' 's/textAnchor: element.text_anchor || '"'start'"',/textAnchor: (() => {\
                                const anchor = debugElementProps(element, "render") || "start";\
                                return anchor;\
                              })(),/' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

# Add debug to text_anchor handling in the alignment buttons
sed -i '' 's/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${selectedElement.text_anchor === '"'start'"' ? '"'bg-blue-50 text-blue-700'"' : '"'text-gray-700 hover:bg-gray-50'"'}`}/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Left alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "start" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}/' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

sed -i '' 's/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${selectedElement.text_anchor === '"'middle'"' ? '"'bg-blue-50 text-blue-700'"' : '"'text-gray-700 hover:bg-gray-50'"'}`}/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Center alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "middle" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}/' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

sed -i '' 's/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${selectedElement.text_anchor === '"'end'"' ? '"'bg-blue-50 text-blue-700'"' : '"'text-gray-700 hover:bg-gray-50'"'}`}/className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Right alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "end" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}/' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

echo "Added render debugging to component. Restart the server to see results."
