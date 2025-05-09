"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Share2, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { useParams } from "next/navigation";

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

export default function NewsDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  // Use id parameter to match the API endpoint
  const id = params.id as string;
  
  const [news, setNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Fetch news data
  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the news article using the id parameter
        // This id could be either a numeric ID or a slug, the API endpoint handles both
        const response = await fetch(`/api/news/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("News article not found");
          }
          throw new Error(`Failed to fetch news: ${response.status}`);
        }
        
        const data = await response.json();
        setNews(data);
      } catch (error: any) {
        console.error("Error fetching news detail:", error);
        setError(error.message || "Failed to load news article");
        setNews(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchNewsDetail();
    }
  }, [id]);

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    
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

  // Share the article
  const shareArticle = () => {
    if (navigator.share) {
      navigator.share({
        title: news?.title || 'Techlympics 2025 News',
        text: news?.excerpt || 'Check out this news article from Techlympics 2025',
        url: window.location.href,
      })
      .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch((err) => console.error('Could not copy text: ', err));
    }
  };

  // Format content with proper paragraphs
  const formatContent = (content?: string) => {
    if (!content) return "";
    
    // Split by double newlines to create paragraphs
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-6">
        {paragraph.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < paragraph.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
    ));
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

      {/* Back Navigation */}
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <Link href="/news" className="inline-flex items-center text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All News
        </Link>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          // Loading Skeleton
          <div className="max-w-4xl mx-auto">
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
            </div>
            <div className="aspect-video w-full rounded-xl bg-gray-700 mb-8 animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="max-w-4xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Error Loading Article</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link 
              href="/news" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-colors"
            >
              Return to News
            </Link>
          </div>
        ) : news ? (
          // News Detail
          <article className="max-w-4xl mx-auto">
            {/* Title and Meta */}
            <header className="mb-8">
              {news.featured && (
                <span className="inline-block bg-gradient-to-r from-yellow-400 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                  Featured
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{news.title}</h1>
              <div className="flex flex-wrap items-center text-gray-300 text-sm gap-4 mb-2">
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <span>{formatDate(news.date)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{news.readTime}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>{news.author}</span>
                </div>
                <button 
                  onClick={shareArticle} 
                  className="ml-auto flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              </div>
              {news.excerpt && (
                <p className="text-lg text-gray-300 mt-4">{news.excerpt}</p>
              )}
            </header>
            
            {/* Featured Image */}
            {news.coverImage && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-10">
                <Image 
                  src={imageError ? fallbackImage : normalizeImagePath(news.coverImage)} 
                  alt={news.title}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={news.coverImage?.startsWith('data:') || false}
                  priority
                />
              </div>
            )}
            
            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {formatContent(news.content)}
            </div>
            
            {/* Author/Source Info */}
            <div className="mt-12 pt-6 border-t border-gray-700">
              <p className="text-gray-300">
                <strong>Author:</strong> {news.author || "Techlympics 2025 Team"}
              </p>
              {news.createdBy?.name && (
                <p className="text-gray-300">
                  <strong>Published by:</strong> {news.createdBy.name}
                </p>
              )}
            </div>
          </article>
        ) : (
          // Not Found
          <div className="max-w-4xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">News Article Not Found</h2>
            <p className="text-gray-300 mb-6">The requested news article could not be found or has been removed.</p>
            <Link 
              href="/news" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-colors"
            >
              Return to News
            </Link>
          </div>
        )}
      </main>
      
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
