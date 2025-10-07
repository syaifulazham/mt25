import React from 'react';

export const PdfBackgroundNote: React.FC = () => {
  return (
    <div className="mb-2 text-xs text-gray-600 bg-blue-50 p-2 border border-blue-200 rounded">
      <p className="font-medium mb-1">💡 About Certificate Generation</p>
      <p>
        The sample PDF will include your certificate text elements positioned as designed. 
        If the actual certificate background file is available, it will be included. 
        Otherwise, a placeholder background will be used.
      </p>
      <p className="mt-1">
        <strong>Important:</strong> If the background appears incorrect in the editor preview or downloaded PDF, 
        please ensure the background file exists at the correct path: <code className="bg-gray-100 px-1">public{'{pdfUrl}'}</code>
      </p>
    </div>
  );
};
