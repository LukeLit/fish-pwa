'use client';

import { useState, ReactNode } from 'react';

export interface AccordionProps {
  /** Title displayed in the accordion header */
  title: string;
  /** Optional badge/indicator shown after the title (e.g., checkmark) */
  badge?: string;
  /** Whether the accordion starts open */
  defaultOpen?: boolean;
  /** Content to display when expanded */
  children: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Whether to show a top border (default: true) */
  showBorder?: boolean;
}

export function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
  className = '',
  showBorder = true,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${showBorder ? 'border-t border-gray-700 pt-4' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded border border-gray-600 transition-colors"
      >
        <span className="text-sm font-bold text-white">
          {title} {badge && <span className="ml-1">{badge}</span>}
        </span>
        <span className="text-white text-sm">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default Accordion;
