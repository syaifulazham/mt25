// Debug function to inspect element properties when rendering
function debugElementProps(element, location) {
  console.log(`Rendering element ${element.id} at ${location} with text_anchor: '${element.text_anchor}' (${typeof element.text_anchor})`);
  return element.text_anchor;
}
