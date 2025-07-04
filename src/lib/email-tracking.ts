/**
 * Email tracking utilities
 * Helps integrate email campaign system with email templates by adding tracking pixels and link tracking
 */

// Base URL for the application (should be configured in environment variables)
const getBaseUrl = () => {
  // For production, use the VERCEL_URL or configured PUBLIC_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }
  // Fallback to localhost for development
  return 'http://localhost:3000';
};

/**
 * Add tracking pixel to HTML email content
 * @param content - The HTML email content
 * @param trackingId - The unique tracking ID for the email
 * @returns HTML content with tracking pixel added
 */
export const addTrackingPixel = (content: string, trackingId: string): string => {
  const baseUrl = getBaseUrl();
  const trackingUrl = `${baseUrl}/api/email/track/open/${trackingId}`;
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;">`;
  
  // Add the tracking pixel right before the closing </body> tag
  if (content.includes('</body>')) {
    return content.replace('</body>', `${trackingPixel}</body>`);
  }
  
  // If no </body> tag found, append to the end
  return content + trackingPixel;
};

/**
 * Convert regular links in HTML content to tracked links
 * @param content - The HTML email content
 * @param trackingId - The unique tracking ID for the email
 * @returns HTML content with tracked links
 */
export const addTrackedLinks = (content: string, trackingId: string): string => {
  const baseUrl = getBaseUrl();
  const trackingBaseUrl = `${baseUrl}/api/email/track/click/${trackingId}?url=`;
  
  // Regular expression to find href attributes in anchor tags
  // This handles both single and double quotes in href attributes
  const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  
  // Replace each href with a tracked version
  return content.replace(hrefRegex, (match, quote, url) => {
    // Skip tracking for anchor links (#), mailto:, tel:, etc.
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match;
    }
    
    // Encode the original URL
    const encodedUrl = encodeURIComponent(url);
    return `<a href=${quote}${trackingBaseUrl}${encodedUrl}${quote}`;
  });
};

/**
 * Process an HTML email template for sending, adding tracking features
 * @param content - The HTML email content
 * @param trackingId - The unique tracking ID for the email
 * @returns Processed HTML content ready for sending
 */
export const prepareEmailContent = (content: string, trackingId: string): string => {
  // First add tracked links, then add the tracking pixel
  let processedContent = addTrackedLinks(content, trackingId);
  processedContent = addTrackingPixel(processedContent, trackingId);
  
  return processedContent;
};

/**
 * Replace placeholders in content with actual values
 * @param content - The template content with placeholders
 * @param placeholders - Object containing placeholder values
 * @returns Content with placeholders replaced
 */
export const replacePlaceholders = (
  content: string,
  placeholders: Record<string, string | null | undefined>
): string => {
  let processedContent = content;
  
  // Replace each placeholder with its value
  Object.entries(placeholders).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    processedContent = processedContent.replace(
      new RegExp(placeholder, 'g'),
      value || ''
    );
  });
  
  return processedContent;
};

/**
 * Process an email for sending with tracking and placeholder replacement
 * @param template - The email template (content and subject)
 * @param recipient - The recipient with placeholders
 * @param trackingId - The unique tracking ID
 * @returns Processed email ready for sending
 */
export const processEmailForSending = (
  template: { subject: string; content: string },
  recipient: { name?: string | null; placeholders?: any },
  trackingId: string
) => {
  // Create placeholders object with recipient name if available
  const placeholders: Record<string, string | null | undefined> = {
    ...(recipient.placeholders || {}),
    name: recipient.name
  };
  
  // Process subject and content
  const subject = replacePlaceholders(template.subject, placeholders);
  let content = replacePlaceholders(template.content, placeholders);
  
  // Add tracking features to content
  content = prepareEmailContent(content, trackingId);
  
  return { subject, content };
};
