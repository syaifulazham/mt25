"use client";

import React from 'react';
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

interface MathRendererProps {
  content: string;
  block?: boolean;
  className?: string;
}

/**
 * MathRenderer - Renders text that may contain LaTeX math expressions
 * 
 * Processes text to render LaTeX math expressions using KaTeX:
 * - Inline math is wrapped in $ symbols: $E=mc^2$
 * - Block math is wrapped in $$ symbols: $$\frac{1}{2}$$
 * 
 * @param content The text content that may contain LaTeX math expressions
 * @param block Whether to render block equations (centered, larger) instead of inline
 * @param className Optional CSS class name
 */
export function MathRenderer({ content, block = false, className = "" }: MathRendererProps) {
  // If content is null or doesn't have any math delimiters, render as plain text
  if (!content || !content.includes('$')) {
    return <span className={className}>{content}</span>;
  }
  
  try {
    // Process content with math expressions
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regular expression to match both inline ($...$) and block ($$...$$) math
    const mathRegex = /\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$/g;
    let match;
    
    while ((match = mathRegex.exec(content)) !== null) {
      // Add text before the math expression
      if (match.index > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Determine if this is block math ($$...$$) or inline math ($...$)
      const isBlockMath = match[0].startsWith('$$');
      const mathContent = isBlockMath ? match[1] : match[2];
      
      if (isBlockMath || block) {
        segments.push(
          <BlockMath key={`math-${match.index}`} math={mathContent} />
        );
      } else {
        segments.push(
          <InlineMath key={`math-${match.index}`} math={mathContent} />
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      segments.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return <div className={className}>{segments}</div>;
  } catch (error) {
    console.error('Error rendering math:', error);
    // Fallback to plain text if there's an error
    return <span className={className}>{content}</span>;
  }
}
