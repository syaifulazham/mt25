  // Function to fix text anchor properties in the elements
  const fixTextAnchorProperties = () => {
    const updatedElements = elements.map(element => {
      const updatedElement = {...element};
      
      // Ensure text_anchor is set based on style.align
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Update text_anchor based on style.align
        if (element.style?.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
    
    // Update state with fixed elements
    setElements(updatedElements);
    
    // Set success message
    setSuccess('Text anchor properties fixed! Try selecting an element now.');
    
    // Print debug info
    console.log('Fixed elements:', updatedElements);
  };

