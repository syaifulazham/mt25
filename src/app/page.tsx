"use client";

import Image from "next/image";
import Link from "next/link";
import MTLogo from "@/lib/images/techlympics-white.png"
import ThemesSection from "./_components/themes-section";
import AnnouncementSection from "./_components/announcement-section";
import NewsSection from "./_components/news-section";
import PartnersSection from "./_components/partners-section";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/mt-logo-white.png" 
                alt="Techlympics 2025 Logo" 
                width={180} 
                height={40} 
                className="h-10 w-auto" 
                priority 
              />
            </Link>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white leading-none">MALAYSIA</span>
              <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">TECHLYMPICS 2025</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="#about" className="hover:text-yellow-400 transition-colors">{t('nav.about')}</Link>
            <Link href="#partners" className="hover:text-yellow-400 transition-colors">{t('nav.partners') || 'Partners'}</Link>
            <Link href="#events" className="hover:text-yellow-400 transition-colors">{t('nav.events')}</Link>
            <Link href="#contact" className="hover:text-yellow-400 transition-colors">{t('nav.contact')}</Link>
          </div>
          
          {/* Language Switcher and Auth Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <LanguageSwitcher />
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <Link href="/participants/auth/login" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all whitespace-nowrap">
                {t('nav.login')}
              </Link>
              <Link href="/participants/auth/register" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 transition-all whitespace-nowrap">
                {t('nav.register')}
              </Link>
            </div>
          </div>
          
          {/* Mobile Menu Button - Hidden for now since we need to implement full mobile menu */}
          <button className="md:hidden text-white p-2 rounded-md focus:outline-none hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
        <div className="md:w-1/2 mb-12 md:mb-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6">
            <div className="flex flex-col items-start">
              <span className="text-xs sm:text-sm md:text-base text-white tracking-wider font-medium mb-1">MALAYSIA</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                {t('hero.title')}
              </span>
            </div>
            <span className="text-2xl sm:text-3xl md:text-4xl block mt-2">{t('hero.subtitle')}</span>
          </h1>
          <p className="text-base sm:text-lg mb-6 sm:mb-8 max-w-xl">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/participants/auth/register" className="text-center px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 transition-all font-medium text-sm sm:text-base">
              {t('hero.cta.register')}
            </Link>
          </div>
        </div>
        <div className="md:w-1/2 relative">
          <div className="w-full h-64 md:h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[90%] h-[90%] relative">
                {/* Olympic-inspired rings with tech twist */}
                <div className="absolute w-full h-full flex items-center justify-center">
                  <Image src={MTLogo} alt="Techlympics Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 text-xs md:text-sm text-white opacity-70">
              Techlympics 2025
            </div>
          </div>
        </div>
      </section>

      {/* Competition Themes Section */}
      <ThemesSection />

      {/* Announcement Section */}
      <AnnouncementSection />

      {/* News Section */}
      <NewsSection />

      {/* Partners Section */}
      <PartnersSection />

      {/* Call to Action */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8">{t('hero.title')}</h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-3xl mx-auto text-gray-300">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <Link href="/participants/auth/register" className="py-2.5 sm:py-3 px-6 sm:px-8 bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 rounded-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition-all">
              {t('hero.cta.register')}
            </Link>
            <Link href="#about" className="py-2.5 sm:py-3 px-6 sm:px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 transition-all">
              {t('hero.cta.learnMore')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Techlympics 2025</h3>
              <p className="text-gray-400 text-sm sm:text-base">Where technology meets Olympic spirit in a competition of innovation and excellence.</p>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Links</h3>
              <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Events</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Resources</h3>
              <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">FAQs</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Support</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Contact</h3>
              <p className="text-gray-400 mb-1 sm:mb-2 text-sm sm:text-base">Email: info@techlympics.my</p>
              <p className="text-gray-400 text-sm sm:text-base">Phone: +60 3 1234 5678</p>
              <div className="flex space-x-4 mt-3 sm:mt-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400 text-sm sm:text-base">
            <p>&copy; 2025 Malaysia Techlympics. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
