"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
export const dynamic = 'force-dynamic';

// Theme type definition
type Theme = {
  id: string | number;
  name: string;
  description: string | null;
  iconUrl?: string;
  logoPath?: string | null;
  color?: string | null;
  isActive?: boolean;
};

// Placeholder themes (will be replaced with real data fetched client-side)
const placeholderThemes: Theme[] = [
  {
    id: '1',
    name: 'Robotics',
    description: 'Build and program robots to solve real-world challenges',
    iconUrl: '/icons/robotics.png',
    isActive: true
  },
  {
    id: '2',
    name: 'Coding',
    description: 'Develop applications and solve complex programming problems',
    iconUrl: '/icons/coding.png',
    isActive: true
  },
  {
    id: '3',
    name: 'AI & Machine Learning',
    description: 'Create intelligent systems that learn and adapt',
    iconUrl: '/icons/ai.png',
    isActive: true
  }
];

async function getThemes() {
  try {
    // Use the public themes endpoint (no auth required)
    const response = await fetch('/api/public/themes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}

export default function ThemesSection() {
  const { t } = useLanguage();
  const [themes, setThemes] = useState<Theme[]>(placeholderThemes);
  
  // Fetch themes on component mount
  useEffect(() => {
    async function fetchThemes() {
      try {
        const data = await getThemes();
        setThemes(data);
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    }
    
    fetchThemes();
  }, []);

  return (
    <section className="py-16 bg-black bg-opacity-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">{t('themes.title')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('themes.description')}
          </p>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
            Techlympics 2025 Competition Themes
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          Explore our exciting competition themes for Techlympics 2025. Each theme represents a unique technological domain where participants can showcase their skills and innovation.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.length > 0 ? (
            themes.map((theme: Theme) => (
              <div 
                key={theme.id} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  {theme.logoPath ? (
                    <Image 
                      src={theme.logoPath} 
                      alt={theme.name} 
                      width={120} 
                      height={120} 
                      className="object-contain max-h-32"
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold"
                      style={{ backgroundColor: theme.color || '#4338ca' }}
                    >
                      {theme.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">{theme.name}</h3>
                  <p className="text-gray-300 text-sm">
                    {theme.description || `Competitions related to ${theme.name} technologies and innovations.`}
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium">
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Placeholder cards when no themes are available
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg flex flex-col"
              >
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-800 relative flex items-center justify-center p-4">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
                    T
                  </div>
                </div>
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2">Technology Theme</h3>
                  <p className="text-gray-300 text-sm">
                    Exciting competitions related to cutting-edge technologies and innovations.
                  </p>
                </div>
                <div className="px-6 pb-4">
                  <button className="w-full py-2 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all text-sm font-medium">
                    View Competitions
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
