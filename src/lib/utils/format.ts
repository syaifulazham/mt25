/**
 * Format number with thousands separator (###,##0)
 * @param value - The number to format
 * @returns Formatted string with thousands separators and no decimal places
 */
export function formatNumber(value: number | string | null | undefined): string {
  // Handle null, undefined or NaN
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return '0';
  }
  
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Format with thousands separator and no decimal places
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true
  }).format(num);
}
