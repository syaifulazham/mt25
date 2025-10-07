#!/bin/bash

# Add the fix button after the Debug button
sed -i '' '/Debug.*ON/,/button>/a \\
              \\
              {/* Fix Text Anchor button */}\\
              <button\\
                type="button"\\
                onClick={() => fixTextAnchorProperties()}\\
                className="mr-2 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center space-x-1"\\
                title="Fix Text Anchor Properties"\\
              >\\
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">\\
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />\\
                </svg>\\
                <span>Fix Alignment</span>\\
              </button>\\
' src/app/organizer/certificates/_components/TemplateEditorFixed.tsx

echo "Added Fix Text Anchor button."
