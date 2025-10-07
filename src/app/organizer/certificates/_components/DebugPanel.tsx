import React from 'react';

interface DebugPanelProps {
  elements: any[];
  selectedElementId: string | null;
}

export function DebugPanel({ elements, selectedElementId }: DebugPanelProps) {
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <div className="fixed bottom-0 right-0 w-80 bg-white border border-gray-300 shadow-lg p-4 opacity-80 hover:opacity-100 transition-opacity z-50 text-xs overflow-auto" style={{ maxHeight: '50vh' }}>
      <h3 className="font-bold text-sm mb-2">Debug Panel</h3>
      <div className="mb-2">
        <strong>Total Elements:</strong> {elements.length}
      </div>
      
      {elements.map(el => (
        <div 
          key={el.id} 
          className={`p-2 mb-1 border ${el.id === selectedElementId ? 'bg-blue-50 border-blue-400' : 'border-gray-200'}`}
        >
          <div className="font-semibold">{el.id} - {el.type}</div>
          <div>
            <strong>text_anchor:</strong> <code>{JSON.stringify(el.text_anchor)}</code>
          </div>
          <div>
            <strong>style.align:</strong> <code>{JSON.stringify(el.style?.align)}</code>
          </div>
          <div>
            <strong>prefix:</strong> <code>{JSON.stringify(el.prefix)}</code>
          </div>
          <div>
            <strong>position:</strong> <code>x: {el.position.x}, y: {el.position.y}</code>
          </div>
        </div>
      ))}
    </div>
  );
}
