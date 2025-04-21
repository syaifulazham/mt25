/**
 * Utility functions for contestant data validation
 */

/**
 * Cleans and validates an IC number
 * @param ic The IC number to validate
 * @returns An object with the cleaned IC and validation status
 */
export function validateIC(ic: string): { 
  value: string; 
  isValid: boolean;
  message?: string;
} {
  // Remove all non-numeric characters
  const cleanedIC = ic.replace(/\D/g, '');
  
  // Check if it's exactly 12 digits
  const isValid = cleanedIC.length === 12;
  
  return {
    value: cleanedIC,
    isValid,
    message: isValid ? undefined : 'IC must be exactly 12 digits'
  };
}

/**
 * Validates a class grade
 * @param grade The class grade to validate
 * @returns An object with the validation status
 */
export function validateClassGrade(grade: string): {
  value: string;
  isValid: boolean;
  message?: string;
} {
  // Valid grades are 1-6 or PPKI
  const validGrades = ['1', '2', '3', '4', '5', '6', 'PPKI'];
  const normalizedGrade = grade?.trim() || '';
  
  const isValid = validGrades.includes(normalizedGrade);
  
  return {
    value: normalizedGrade,
    isValid,
    message: isValid ? undefined : 'Grade must be 1, 2, 3, 4, 5, 6, or PPKI'
  };
}

/**
 * Determines gender based on IC number
 * @param ic The IC number
 * @returns The determined gender (MALE or FEMALE)
 */
export function determineGender(ic: string): string {
  // Remove all non-numeric characters
  const cleanedIC = ic.replace(/\D/g, '');
  
  // If IC is not valid, return empty string
  if (cleanedIC.length !== 12) {
    return '';
  }
  
  // Get the last digit
  const lastDigit = parseInt(cleanedIC.charAt(11));
  
  // Odd is MALE, even is FEMALE
  return lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
}

/**
 * Calculates age based on IC number
 * @param ic The IC number
 * @returns The calculated age
 */
export function calculateAge(ic: string): number {
  // Remove all non-numeric characters
  const cleanedIC = ic.replace(/\D/g, '');
  
  // If IC is not valid, return 0
  if (cleanedIC.length !== 12) {
    return 0;
  }
  
  // Get the first 2 digits (year of birth - last 2 digits)
  const birthYearLastTwoDigits = parseInt(cleanedIC.substring(0, 2));
  
  // Determine the full birth year (assuming 20XX for all contestants)
  const birthYear = 2000 + birthYearLastTwoDigits;
  
  // Calculate age based on current year
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

/**
 * Validates a contestant record
 * @param record The contestant record to validate
 * @returns Validated and transformed record with validation status
 */
export function validateContestantRecord(record: any): {
  data: any;
  isValid: boolean;
  validationErrors: Record<string, string>;
} {
  const validationErrors: Record<string, string> = {};
  
  // Validate required fields
  if (!record.name?.trim()) {
    validationErrors.name = 'Name is required';
  }
  
  // Validate and clean IC
  const icValidation = validateIC(record.ic || '');
  if (!icValidation.isValid) {
    validationErrors.ic = icValidation.message || 'Invalid IC';
  }
  
  // Validate class grade if provided
  if (record.class_grade) {
    const gradeValidation = validateClassGrade(record.class_grade);
    if (!gradeValidation.isValid) {
      validationErrors.class_grade = gradeValidation.message || 'Invalid grade';
    }
  }
  
  // Validate education level
  const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
  if (!record.edu_level || !validEduLevels.includes(record.edu_level.toLowerCase())) {
    validationErrors.edu_level = 'Education level must be one of: sekolah rendah, sekolah menengah, belia';
  }
  
  // Create transformed data
  const transformedData = {
    ...record,
    ic: icValidation.value,
    gender: determineGender(record.ic || ''),
    age: calculateAge(record.ic || ''),
    class_grade: record.class_grade ? validateClassGrade(record.class_grade).value : undefined
  };
  
  return {
    data: transformedData,
    isValid: Object.keys(validationErrors).length === 0,
    validationErrors
  };
}
