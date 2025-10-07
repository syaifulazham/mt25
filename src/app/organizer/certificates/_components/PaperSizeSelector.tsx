import React from 'react';

export interface PaperSize {
  name: string;
  width: number;  // in points (72 dpi)
  height: number; // in points (72 dpi)
  orientation: 'portrait' | 'landscape';
}

// Standard paper sizes in points (72 dpi)
export const PAPER_SIZES: Record<string, PaperSize> = {
  'A4-Portrait': {
    name: 'A4 Portrait',
    width: 595,
    height: 842,
    orientation: 'portrait'
  },
  'A4-Landscape': {
    name: 'A4 Landscape',
    width: 842,
    height: 595,
    orientation: 'landscape'
  },
  'Letter-Portrait': {
    name: 'Letter Portrait',
    width: 612,
    height: 792,
    orientation: 'portrait'
  },
  'Letter-Landscape': {
    name: 'Letter Landscape',
    width: 792,
    height: 612,
    orientation: 'landscape'
  },
  'A5-Portrait': {
    name: 'A5 Portrait',
    width: 420,
    height: 595,
    orientation: 'portrait'
  },
  'A5-Landscape': {
    name: 'A5 Landscape',
    width: 595,
    height: 420,
    orientation: 'landscape'
  }
};

interface PaperSizeSelectorProps {
  currentSize: { width: number; height: number };
  onSizeChange: (paperSize: PaperSize) => void;
}

const PaperSizeSelector: React.FC<PaperSizeSelectorProps> = ({ currentSize, onSizeChange }) => {
  // Find the paper size that matches current dimensions
  const getCurrentSizeKey = (): string => {
    const { width, height } = currentSize;
    
    // Find exact match
    for (const [key, size] of Object.entries(PAPER_SIZES)) {
      if (size.width === width && size.height === height) {
        return key;
      }
    }
    
    // If no match, return A4-Landscape as default
    return 'A4-Landscape';
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSize = PAPER_SIZES[e.target.value];
    if (selectedSize) {
      onSizeChange(selectedSize);
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="paper-size" className="text-sm font-medium text-gray-700">
        Paper Size
      </label>
      <select
        id="paper-size"
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        value={getCurrentSizeKey()}
        onChange={handleSizeChange}
      >
        {Object.entries(PAPER_SIZES).map(([key, size]) => (
          <option key={key} value={key}>
            {size.name} ({size.width}×{size.height})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">
        Changing the paper size will affect the position of elements.
      </p>
    </div>
  );
};

export default PaperSizeSelector;
