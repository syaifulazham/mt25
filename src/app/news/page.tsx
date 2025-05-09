"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Search, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";

// News type definition
type News = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  date: string;
  readTime: string;
  author: string;
  featured: boolean;
  slug: string;
  isPublished: boolean;
  createdBy?: {
    id: string;
    name: string;
    username: string;
  };
};

// Pagination metadata type
type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  
  // For production environment, we might need to add the base URL
  // This handles cases where the image might be stored in a different location
  if (process.env.NODE_ENV === 'production') {
    // Check if we're using a base path in production
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath && !path.startsWith(basePath)) {
      return `${basePath}${path}`;
    }
  }
  
  return path;
};

export default function NewsPage() {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fetch news data
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('publishedOnly', 'true');
        params.append('page', currentPage.toString());
        params.append('pageSize', '9');
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        const response = await fetch(`/api/news?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
          // Simple array format
          setNews(data);
          setMeta(null);
        } else if (data.data && Array.isArray(data.data)) {
          // Paginated format
          setNews(data.data);
          setMeta(data.meta);
        } else {
          console.error("Unexpected data format:", data);
          setNews([]);
          setMeta(null);
        }
      } catch (error) {
        console.error("Error fetching news:", error);
        setNews([]);
        setMeta(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNews();
  }, [currentPage, searchTerm]);

  // Handle image error
  const handleImageError = (id: string) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };

  // Format date string
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

  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle page change
  const changePage = (page: number) => {
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

      {/* Back to Home Link */}
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <Link href="/" className="inline-flex items-center text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Page Header */}
      <header className="container mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
            {t('news.title')}
          </span>
        </h1>
        <p className="text-center text-gray-300 mb-8 max-w-3xl mx-auto">
          Stay updated with the latest announcements, developments, and milestones from Techlympics 2025
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search news articles..."
              className="w-full px-5 py-3 pr-12 rounded-full bg-gray-800 bg-opacity-50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </header>

      {/* News Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg animate-pulse">
                <div className="h-56 bg-gray-700"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        ) : news.length > 0 ? (
          // News Items
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((item) => (
                <div key={item.id} className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
                  <div className="relative h-56 w-full">
                    <Image 
                      src={imageErrors[item.id] ? fallbackImage : normalizeImagePath(item.coverImage)} 
                      alt={item.title}
                      fill
                      className="object-cover"
                      onError={() => handleImageError(item.id)}
                      unoptimized={item.coverImage?.startsWith('data:') || false}
                    />
                    {item.featured && (
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-gray-300 mb-4 line-clamp-3">{item.excerpt}</p>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="flex items-center space-x-2 text-gray-400 text-sm">
                        <CalendarDays className="h-4 w-4" />
                        <span>{formatDate(item.date)}</span>
                        <span className="mx-1">•</span>
                        <Clock className="h-4 w-4" />
                        <span>{item.readTime}</span>
                      </div>
                      <Link 
                        href={`/news/${item.id}`} 
                        className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                      >
                        {t('news.readMore')} <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={!meta.hasPrevPage}
                    className={`p-2 rounded-full ${!meta.hasPrevPage ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {[...Array(meta.totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show first page, last page, and 1 page before and after current page
                    const shouldShow = 
                      page === 1 || 
                      page === meta.totalPages || 
                      Math.abs(page - currentPage) <= 1;
                      
                    // Show dots only once between gaps
                    const showDots = !shouldShow && 
                      ((page === 2 && currentPage > 3) || 
                       (page === meta.totalPages - 1 && currentPage < meta.totalPages - 2));
                    
                    if (shouldShow) {
                      return (
                        <button
                          key={page}
                          onClick={() => changePage(page)}
                          className={`w-10 h-10 rounded-full ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                              : 'text-white hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (showDots) {
                      return <span key={page} className="text-gray-500">...</span>;
                    }
                    
                    return null;
                  })}
                  
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={!meta.hasNextPage}
                    className={`p-2 rounded-full ${!meta.hasNextPage ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          // No Results
          <div className="text-center py-16">
            <h3 className="text-2xl font-semibold mb-4">No news articles found</h3>
            {searchTerm ? (
              <p className="text-gray-300 mb-6">
                No results found for "{searchTerm}". Try a different search term or browse all news.
              </p>
            ) : (
              <p className="text-gray-300 mb-6">
                There are no published news articles available at this time. Please check back later.
              </p>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              >
                View All News
              </button>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-16 py-12 bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-400 mb-4">
            &copy; {new Date().getFullYear()} {t('footer.techlympics')}. {t('footer.rights')}.
          </p>
          <div className="flex justify-center space-x-6 mt-6">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/#about" className="text-gray-400 hover:text-white transition-colors">
              {t('nav.about')}
            </Link>
            <Link href="/#partners" className="text-gray-400 hover:text-white transition-colors">
              {t('nav.partners')}
            </Link>
            <Link href="/#contact" className="text-gray-400 hover:text-white transition-colors">
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
