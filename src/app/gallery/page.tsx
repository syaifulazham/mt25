"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Search, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";

// Types
type Gallery = {
  id: number;
  title: string;
  description: string;
  coverPhoto?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
  user?: {
    name: string;
    username: string;
  };
};

// Pagination metadata type
type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

// Fallback image for when the actual image is missing
const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='20' text-anchor='middle' alignment-baseline='middle' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

// Helper function to normalize image paths
const normalizeImagePath = (path: string | null | undefined): string => {
  if (!path) return fallbackImage;
  
  // If it's already a data URL or absolute URL, return as is
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  
  // Add 'uploads' prefix if not already there (based on how images are stored in the system)
  if (!path.includes('/uploads/') && !path.startsWith('/uploads/')) {
    path = `/uploads${path}`;
  }
  
  // For production environment, we might need to add the base URL
  // This handles cases where the image might be stored in a different location
  if (process.env.NODE_ENV === 'production') {
    // Check if we're using a base path in production
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath && !path.startsWith(basePath)) {
      return `${basePath}${path}`;
    }
  }
  
  // Add a cache-busting parameter to force refresh of images
  return `${path}?t=${Date.now()}`;
};

// Format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateString;
  }
};

export default function GalleriesPage() {
  const { t } = useLanguage();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Fetch galleries data
  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        setIsLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('pageSize', '9');
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        // Fetch published galleries
        const response = await fetch(`/api/public/gallery-photos/galleries?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Galleries API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
          // Simple array format
          setGalleries(data);
          setMeta(null);
        } else if (data.data && Array.isArray(data.data)) {
          // Paginated format
          setGalleries(data.data);
          setMeta(data.pagination);
        } else {
          console.error("Unexpected data format:", data);
          setGalleries([]);
          setMeta(null);
        }
      } catch (error) {
        console.error("Error fetching galleries:", error);
        setGalleries([]);
        setMeta(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGalleries();
  }, [currentPage, searchTerm]);

  const handleImageError = (id: number) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };
  
  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <Link href="/#about" className="hover:text-yellow-400 transition-colors">{t('nav.about')}</Link>
            <Link href="/#partners" className="hover:text-yellow-400 transition-colors">{t('nav.partners')}</Link>
            <Link href="/#events" className="hover:text-yellow-400 transition-colors">{t('nav.events')}</Link>
            <Link href="/#contact" className="hover:text-yellow-400 transition-colors">{t('nav.contact')}</Link>
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
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
              {t('gallery.pageTitle') || 'Photo Galleries'}
            </span>
          </h1>
          <p className="text-gray-300 max-w-3xl mx-auto text-center mb-8">
            {t('gallery.pageDescription') || 'Browse photo galleries from Techlympics events and activities'}
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto relative mb-12">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t('gallery.searchPlaceholder') || 'Search galleries...'}
              className="w-full py-3 px-4 pl-12 rounded-full bg-gray-800 bg-opacity-50 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-400"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </form>
        </div>
        
        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg animate-pulse">
                <div className="h-48 bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : galleries.length === 0 ? (
          // Empty State
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-10 text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {searchTerm 
                ? (t('gallery.noSearchResults') || 'No galleries matching your search') 
                : (t('gallery.noGalleries') || 'No Galleries Available')}
            </h2>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? (t('gallery.tryDifferentSearch') || 'Try a different search term or browse all galleries') 
                : (t('gallery.checkBackSoon') || 'Check back soon for new photo galleries.')}
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-colors"
              >
                {t('gallery.clearSearch') || 'Clear Search'}
              </button>
            )}
          </div>
        ) : (
          // Galleries Grid
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {galleries.map((gallery) => (
                <Link key={gallery.id} href={`/gallery/${gallery.id}`}>
                  <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all group transform hover:-translate-y-1 duration-300 h-full">
                    <div className="relative h-48 w-full">
                      {gallery.coverPhoto ? (
                        <Image 
                          src={imageErrors[gallery.id] ? fallbackImage : normalizeImagePath(gallery.coverPhoto)} 
                          alt={gallery.title}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(gallery.id)}
                          unoptimized={gallery.coverPhoto?.startsWith('data:') || false}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-700">
                          <Camera className="h-12 w-12 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors duration-300">{gallery.title}</h3>
                      <p className="text-gray-300 mb-4 line-clamp-2">{gallery.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-400 text-sm">
                          <CalendarDays className="h-4 w-4 mr-1" />
                          {formatDate(gallery.createdAt)}
                        </div>
                        <div className="text-blue-400 hover:text-blue-300 flex items-center transition-colors group-hover:translate-x-1 transform duration-300">
                          {t('gallery.viewGallery') || 'View Gallery'} <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  className={`p-2 rounded-full ${currentPage === 1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-800 transition-colors'}`}
                  onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: meta.totalPages }).map((_, index) => {
                  const page = index + 1;
                  // Show first page, last page, current page, and one page before and after current
                  const shouldShowPage = 
                    page === 1 || 
                    page === meta.totalPages ||
                    page === currentPage ||
                    page === currentPage - 1 ||
                    page === currentPage + 1;
                    
                  // Show dots only once between gaps
                  const showDots = 
                    (page === 2 && currentPage > 3) ||
                    (page === meta.totalPages - 1 && currentPage < meta.totalPages - 2);
                    
                  if (shouldShowPage) {
                    return (
                      <button
                        key={page}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPage === page
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'text-white hover:bg-gray-800 transition-colors'
                        }`}
                        onClick={() => goToPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    );
                  } else if (showDots) {
                    return <span key={`dots-${page}`} className="text-gray-500">...</span>;
                  }
                  
                  return null;
                })}
                
                <button
                  className={`p-2 rounded-full ${currentPage === meta.totalPages ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-800 transition-colors'}`}
                  onClick={() => currentPage < meta.totalPages && goToPage(currentPage + 1)}
                  disabled={currentPage === meta.totalPages}
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Back to Home */}
        <div className="text-center mt-16">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('general.backToHome') || 'Back to Home'}
          </Link>
        </div>
      </main>
    </div>
  );
}
