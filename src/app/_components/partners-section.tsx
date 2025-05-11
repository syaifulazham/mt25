import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';

// Define the partner type
interface Partner {
  logo: string;
  name: string;
  link: string;
  category: 'education' | 'industry' | 'academic' | 'government' | 'other';
  description?: string;
}

export const PartnersSection = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  
  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // List of partners with their details
  const partners: Partner[] = [
    {
      logo: '/images/bioeconomy-logo-circle.png',
      name: 'Bioeconomy Corporation',
      link: 'https://www.bioeconomycorporation.my/',
      category: 'industry',
      description: 'Driving the growth of the bio-based industry in Malaysia'
    }
    // Other partners hidden as requested
  ];

  // Available categories
  const categories = ['all', 'education', 'industry', 'academic', 'government', 'other'];
  
  // Filter partners by active category
  const filteredPartners = activeCategory === 'all' 
    ? partners 
    : partners.filter(partner => partner.category === activeCategory);

  return (
    <section id="partners" className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
              {t('partners.title') || 'Strategic Partners'}
            </span>
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto px-4">
            {t('partners.description') || 'Our key partners helping to make Techlympics 2025 a reality'}
          </p>
        </div>
        
        {/* Category Filter */}
        <div className="flex flex-wrap justify-center mb-8 gap-2 sm:gap-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm rounded-full transition-all ${activeCategory === category 
                ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-white font-medium shadow-lg' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {t(`partners.categories.${category}`) || category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Partners Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {filteredPartners.map((partner, index) => (
            <Link 
              href={partner.link} 
              key={index}
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 transition-all hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-gray-600"
            >
              <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24'} mb-3 sm:mb-4`}>
                <Image 
                  src={partner.logo} 
                  alt={partner.name} 
                  fill 
                  className="object-contain p-1" 
                />
              </div>
              <div className="text-center">
                <h3 className="text-sm sm:text-base font-medium text-white group-hover:text-yellow-400 transition-colors">
                  {partner.name}
                </h3>
                {partner.description && (
                  <p className="mt-1 text-xs text-gray-400 hidden sm:block">{partner.description}</p>
                )}
                <span className="inline-block mt-2 text-xs py-1 px-2 rounded-full bg-gray-700 text-gray-300 capitalize">
                  {partner.category}
                </span>
              </div>
            </Link>
          ))}
        </div>
        
        {filteredPartners.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">{t('partners.no_partners') || 'No partners found in this category'}</p>
          </div>
        )}
        
        <div className="mt-12 text-center">
          <Link 
            href="/partners" 
            className="inline-block py-2 px-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-sm sm:text-base transition-all"
          >
            {t('partners.view_all') || 'View All Partners'}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
