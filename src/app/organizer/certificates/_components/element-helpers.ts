/**
 * Helper functions for working with template elements
 */

// Element type definition
export interface Element {
  id: string;
  type: 'static_text' | 'dynamic_text' | 'image';
  position: { x: number; y: number };
  content?: string;
  prefix?: string;
  placeholder?: string;
  style?: any;
  text_anchor?: 'start' | 'middle' | 'end';
  layer: number;
  isSelected?: boolean;
}

/**
 * Process loaded elements to ensure all required properties are set
 */
export function processElements(elements: any[] = []): Element[] {
  return elements.map(element => {
    // Deep clone to avoid reference issues
    const processed = JSON.parse(JSON.stringify(element));
    
    if (element.type === 'dynamic_text' || element.type === 'static_text') {
      // Set text_anchor based on style.align if missing
      if (processed.text_anchor === undefined) {
        if (element.style?.align === 'center') {
          processed.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          processed.text_anchor = 'end';
        } else {
          processed.text_anchor = 'start';
        }
      }
      
      // Ensure style object exists
      if (!processed.style) {
        processed.style = {
          font_family: 'Arial',
          font_size: 16,
          color: '#000000',
          font_weight: 'normal',
          align: 'left'
        };
      }
      
      // Ensure style.align exists
      if (!processed.style.align) {
        processed.style.align = 'left';
      }
      
      // Ensure prefix exists for dynamic text
      if (element.type === 'dynamic_text' && processed.prefix === undefined) {
        processed.prefix = '';
      }
    }
    
    return processed;
  });
}

/**
 * Ensure element has all required properties for rendering
 */
export function ensureElementProperties(element: Element): Element {
  const result = { ...element };
  
  // Ensure text_anchor is set
  if (!result.text_anchor) {
    if (element.style?.align === 'center') {
      result.text_anchor = 'middle';
    } else if (element.style?.align === 'right') {
      result.text_anchor = 'end';
    } else {
      result.text_anchor = 'start';
    }
  }
  
  // Ensure prefix exists for dynamic text
  if (element.type === 'dynamic_text' && result.prefix === undefined) {
    result.prefix = '';
  }
  
  return result;
}
