"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import MTLogo from "@/lib/images/techlympics-white.png"
import ThemesSection from "./_components/themes-section";
import AnnouncementSection from "./_components/announcement-section";
import GallerySection from "./_components/gallery-section";
import GalleryCarousel from "./_components/gallery-carousel";
import NewsSection from "./_components/news-section";
import PartnersSection from "./_components/partners-section";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";

export default function Home() {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            <Link href="#themes" className="hover:text-yellow-400 transition-colors">{t('nav.themes') || 'Themes'}</Link>
            <Link href="#announcements" className="hover:text-yellow-400 transition-colors">{t('nav.announcements') || 'Announcements'}</Link>
            <Link href="#gallery" className="hover:text-yellow-400 transition-colors">{t('nav.gallery') || 'Gallery'}</Link>
            <Link href="#news" className="hover:text-yellow-400 transition-colors">{t('nav.news') || 'News'}</Link>
            <Link href="#partners" className="hover:text-yellow-400 transition-colors">{t('nav.partners') || 'Partners'}</Link>
          </div>
          
          {/* Language Switcher and Auth Buttons (only visible on desktop) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <LanguageSwitcher />
            <div className="hidden md:flex flex-wrap gap-2 sm:gap-4">
              <Link href="/participants/auth/login" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all whitespace-nowrap">
                {t('nav.login')}
              </Link>
              <Link href="/participants/auth/register" className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 transition-all whitespace-nowrap">
                {t('nav.register')}
              </Link>
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2 rounded-md focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col space-y-3 animate-fadeIn">
            <Link 
              href="#about" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.about')}
            </Link>
            <Link 
              href="#themes" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.themes') || 'Themes'}
            </Link>
            <Link 
              href="#announcements" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.announcements') || 'Announcements'}
            </Link>
            <Link 
              href="#gallery" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.gallery') || 'Gallery'}
            </Link>
            <Link 
              href="#news" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.news') || 'News'}
            </Link>
            <Link 
              href="#partners" 
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.partners') || 'Partners'}
            </Link>
            <div className="flex justify-evenly mt-2 pt-2 border-t border-white/20">
              <Link 
                href="/participants/auth/login" 
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </Link>
              <Link 
                href="/participants/auth/register" 
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.register')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="w-full md:w-1/2 order-2 md:order-1 mb-8 md:mb-0">
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
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/participants/auth/register" 
                className="text-center px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 transition-all font-medium text-sm sm:text-base w-full sm:w-auto"
              >
                {t('hero.cta.register')}
              </Link>
              <Link 
                href="#about" 
                className="text-center px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all font-medium text-sm sm:text-base w-full sm:w-auto mt-3 sm:mt-0"
              >
                {t('hero.cta.learnMore') || 'Learn More'}
              </Link>
            </div>
          </div>
          <div className="w-full md:w-1/2 order-1 md:order-2 flex justify-center">
            <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl">
              <GalleryCarousel />
            </div>
          </div>
        </div>
      </section>

      
      {/* About Us Section */}
      <section id="about" className="py-12 sm:py-16 bg-gradient-to-b from-indigo-900/70 to-purple-900/70">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                {t('about.title')}
              </span>
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8 sm:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-black/20 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl">
                <p className="mb-6 text-gray-300 leading-relaxed">
                  {t('about.description.part1')}
                </p>
                
                <p className="text-gray-300 leading-relaxed">
                  {t('about.description.part2')}
                </p>
              </div>
            </div>
            
            
          </div>
          
          
        </div>
      </section>

      {/* Competition Themes Section */}
      <section id="themes">
        <ThemesSection />
      </section>


      {/* Announcement Section */}
      <section id="announcements">
        <AnnouncementSection />
      </section>

      {/* Gallery Section */}
      <section id="gallery">
        <GallerySection />
      </section>

      {/* News Section */}
      <section id="news">
        <NewsSection />
      </section>

      {/* Partners Section */}
      <section id="partners">
        <PartnersSection />
      </section>

      {/* Call to Action */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto bg-black/10 rounded-2xl p-6 sm:p-10 backdrop-blur-sm shadow-xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              {t('hero.title')}
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-3xl mx-auto text-gray-200">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link 
                href="/participants/auth/register" 
                className="py-3 px-8 bg-gradient-to-r from-yellow-400 to-red-500 hover:from-yellow-500 hover:to-red-600 rounded-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {t('hero.cta.register')}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link 
                href="#about" 
                className="py-3 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 transition-all w-full sm:w-auto flex items-center justify-center"
              >
                {t('hero.cta.learnMore') || 'Learn More'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            <div className="col-span-1 xs:col-span-2 md:col-span-1">
              <div className="flex items-center mb-4">
                <Image 
                  src="/images/mt-logo-white.png" 
                  alt="Techlympics 2025 Logo" 
                  width={40} 
                  height={40} 
                  className="h-8 w-auto mr-2" 
                  priority 
                />
                <h3 className="text-lg sm:text-xl font-bold">{t('hero.title')}</h3>
              </div>
              <p className="text-gray-400 text-sm sm:text-base mb-4">{t('hero.subtitle')}</p>
              
              {/* Mobile Social Links */}
              <div className="flex space-x-5 mt-4 md:hidden">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                </Link>
              </div>
            </div>
            
            <div className="footer-links">
              <h3 className="text-lg sm:text-xl font-bold mb-4 md:mb-5">Quick Links</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                <li><Link href="#about" className="text-gray-400 hover:text-white transition-colors inline-block py-1">About</Link></li>
                <li><Link href="#events" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Events</Link></li>
                <li><Link href="#partners" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Partners</Link></li>
                <li><Link href="#contact" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Contact</Link></li>
              </ul>
            </div>
            
            <div className="footer-links">
              <h3 className="text-lg sm:text-xl font-bold mb-4 md:mb-5">Resources</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Documentation</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors inline-block py-1">FAQs</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Support</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors inline-block py-1">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div className="footer-contact">
              <h3 className="text-lg sm:text-xl font-bold mb-4 md:mb-5">Contact</h3>
              <div className="space-y-3">
                <p className="text-gray-400 text-sm sm:text-base flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                  info@techlympics.my
                </p>
                <p className="text-gray-400 text-sm sm:text-base flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                  +60 3 1234 5678
                </p>
              </div>
              
              {/* Desktop Social Links */}
              <div className="hidden md:flex space-x-4 mt-5">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p className="mb-4">&copy; 2025 Malaysia Techlympics. All Rights Reserved.</p>
            <div className="flex justify-center space-x-4 text-xs">
              <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</Link>
              <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
