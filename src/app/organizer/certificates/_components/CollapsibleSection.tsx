import React, { useState, ReactNode } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children,
  defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 hover:bg-gray-100 p-3 flex items-center justify-between text-left transition-all duration-200"
      >
        <span className="font-medium text-gray-800">{title}</span>
        {isOpen ? (
          <FiChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <FiChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
