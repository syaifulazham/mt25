
// Paste this in browser console when viewing the template editor
(function() {
  // Helper to check element properties in browser
  function debugTemplateElements() {
    const elements = document.querySelectorAll('.element');
    console.log('Found ' + elements.length + ' elements in DOM');
    
    // Try to access elements from React state
    console.log('REACT STATE INSPECTION:');
    console.log('If you see any error below, ignore it. This is just an attempt to access React state.');
    
    // Attempt to find React instance
    let reactInstance = null;
    for (const key in window) {
      if (key.startsWith('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
        reactInstance = key;
        break;
      }
    }
    
    console.log('React instance found: ' + (reactInstance !== null));
    
    console.log('=============== MANUAL CHECK ===============');
    console.log('Please click on each element in the editor and check if the text alignment controls show the correct state.');
    console.log('When you click an element, note if the left/center/right alignment buttons show the correct active state.');
  }
  
  // Execute the debug function
  debugTemplateElements();
})();
