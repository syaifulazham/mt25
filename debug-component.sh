#!/bin/bash

# Create a backup of the original file
cp src/app/organizer/certificates/_components/TemplateEditorFixed.tsx src/app/organizer/certificates/_components/TemplateEditorFixed.tsx.bak

# Create a debug component using sed to avoid direct file editing
cat > debug-component.txt << 'EOF'
  // IMMEDIATE DEBUG: Log template configuration as received from server
  console.log('TEMPLATE RAW DATA FROM SERVER:', JSON.stringify(template?.configuration?.elements?.map(el => ({
    id: el.id,
    type: el.type,
    text_anchor: el.text_anchor,
    style: el.style,
    prefix: el.prefix
  })), null, 2));
EOF

# Insert debug code at beginning of component
sed -i '' 's/export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {/export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {\
  \/\/ IMMEDIATE DEBUG: Log template configuration as received from server\
  console.log("TEMPLATE RAW DATA FROM SERVER:", JSON.stringify(template?.configuration?.elements?.map(el => ({\
    id: el.id,\
    type: el.type,\
    text_anchor: el.text_anchor,\
    style: el.style,\
    prefix: el.prefix\
  })), null, 2));\
/' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

echo "Debug code added to component. Restart the server to see results."
