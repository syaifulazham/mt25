'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCookie, setCookie } from './cookies';

// Define language options
export type Language = 'en' | 'my' | 'zh' | 'fil';

// Create context with default values
type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

// Set 'my' (Malay) as the default language
const defaultContext: LanguageContextType = {
  language: 'my',
  setLanguage: () => {},
  t: (key: string) => key,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

// Hook for using the language context
export const useLanguage = () => useContext(LanguageContext);

// Language provider component
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to 'my' (Malay) instead of 'en'
  const [language, setLanguageState] = useState<Language>('my');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  
  // Load saved language preference from cookies on initial render
  // This runs only once on component mount
  useEffect(() => {
    try {
      // Try to get language from cookie
      const savedLang = getCookie('language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'my' || savedLang === 'zh' || savedLang === 'fil')) {
        // If we have a valid cookie, just use it without setting a new cookie
        setLanguageState(savedLang);
        console.log(`Loaded language from cookie: ${savedLang}`);
      } else {
        // If no cookie set yet, use Malay as default and set cookie
        // This is the only place we set the cookie during initialization
        setCookie('language', 'my');
        console.log('No language cookie found, setting default to Malay');
      }
    } catch (e) {
      // Ignore cookie errors
      console.error('Error accessing cookies:', e);
    }
  }, []);
  
  // Load translations when language changes
  // This runs whenever language state changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translations = (await import(`./translations/${language}.json`)).default;
        setTranslations(translations);
      } catch (error) {
        console.error('Failed to load translations:', error);
        setTranslations({});
      }
    };
    
    loadTranslations();
    
    // DO NOT set cookie here - we only want to set it when setLanguage is called explicitly
    // This prevents the cookie from being updated on page load/reload
  }, [language]);
  
  // Function to set language
  const setLanguage = (lang: Language) => {
    // Update state
    setLanguageState(lang);
    
    // Save immediately to cookie
    setCookie('language', lang);
    
    // Log language change for debugging
    console.log(`Language changed to: ${lang}`);
  };
  
  // Translation function
  const t = (key: string): string => {
    return translations[key] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
