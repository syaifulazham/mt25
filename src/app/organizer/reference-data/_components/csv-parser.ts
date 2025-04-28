import Papa from 'papaparse';

// Function to parse CSV using PapaParse library
export const parseCsv = (csvText: string) => {
  try {
    // Try to parse with PapaParse
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    // Return the parsed data
    return {
      data: result.data || [],
      meta: result.meta || { fields: [] },
      errors: result.errors || [],
    };
  } catch (error: any) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
};

// Function to normalize CSV data
export const normalizeCsvData = (data: any[]) => {
  return data.map(row => {
    const normalizedRow: Record<string, any> = {};
    
    // Normalize each field in the row
    Object.entries(row).forEach(([key, value]) => {
      // Convert key to lowercase and remove special characters
      const normalizedKey = key.toLowerCase().trim();
      
      // Convert value to string and trim
      const normalizedValue = value !== null && value !== undefined 
        ? String(value).trim() 
        : '';
      
      normalizedRow[normalizedKey] = normalizedValue;
    });
    
    return normalizedRow;
  });
};
