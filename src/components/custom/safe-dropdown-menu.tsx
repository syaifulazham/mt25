"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SafeDropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface SafeDropdownMenuProps {
  trigger: React.ReactNode;
  items: SafeDropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}

const SafeDropdownMenu: React.FC<SafeDropdownMenuProps> = ({
  trigger,
  items,
  align = "right",
  className,
  menuClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown when pressing escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <div onClick={toggleDropdown} className="cursor-pointer">
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            menuClassName
          )}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
        >
          <div className="py-1" role="none">
            {items.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {item.separator && <div className="h-px bg-gray-200 my-1"></div>}
                {!item.separator && (
                  <div
                    onClick={() => {
                      if (!item.disabled && item.onClick) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
                      item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                    role="menuitem"
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.label}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeDropdownMenu;
