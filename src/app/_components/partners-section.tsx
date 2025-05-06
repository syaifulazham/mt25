import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';

// Define the partner type
interface Partner {
  logo: string;
  name: string;
  link: string;
  category?: 'education' | 'industry' | 'academic' | 'other';
}

export const PartnersSection = () => {
  const { t } = useLanguage();
  
  // List of partners with their details
  const partners: Partner[] = [
    {
      logo: '/images/bioeconomy-logo-circle.png',
      name: 'Bioeconomy Corporation',
      link: 'https://www.bioeconomycorporation.my/',
      category: 'industry'
    },
    // Additional partners can be added here
  ];

  return (
    <section id="partners" className="py-12 sm:py-16 md:py-20 bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
            {t('partners.title')}
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          {t('partners.description')}
        </p>
        
        {/* Partners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
          {partners.map((partner, index) => (
            <Link 
              href={partner.link} 
              key={index}
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-6 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative w-24 h-24 mb-4">
                <Image 
                  src={partner.logo} 
                  alt={partner.name} 
                  fill 
                  className="object-contain" 
                />
              </div>
              <h3 className="text-center text-lg font-medium text-white group-hover:text-yellow-400 transition-colors capitalize">
                {partner.name}
              </h3>
            </Link>
          ))}
        </div>
        
        
      </div>
    </section>
  );
};

export default PartnersSection;
