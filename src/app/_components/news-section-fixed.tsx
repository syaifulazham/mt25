"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
export const dynamic = 'force-dynamic';

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

export default function NewsSection() {
  const { t } = useLanguage();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [featuredNews, setFeaturedNews] = useState<News | null>(null);
  const [otherNews, setOtherNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch news data
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        
        // Fetch featured news
        const featuredResponse = await fetch('/api/news?featuredOnly=true&publishedOnly=true&pageSize=1');
        
        if (!featuredResponse.ok) {
          throw new Error(`Featured news API error: ${featuredResponse.status}`);
        }
        
        const featuredData = await featuredResponse.json();
        
        // Fetch other news
        const otherResponse = await fetch('/api/news?publishedOnly=true&pageSize=4');
        
        if (!otherResponse.ok) {
          throw new Error(`Other news API error: ${otherResponse.status}`);
        }
        
        const otherData = await otherResponse.json();
        
        // Handle both array and paginated response formats
        const featuredNewsData = Array.isArray(featuredData) 
          ? featuredData 
          : featuredData.data || [];
          
        const otherNewsData = Array.isArray(otherData) 
          ? otherData 
          : otherData.data || [];
        
        // Filter out the featured news from other news to avoid duplication
        let filteredOtherNews = otherNewsData;
        if (featuredNewsData.length > 0) {
          const featuredId = featuredNewsData[0].id;
          filteredOtherNews = otherNewsData.filter((news: News) => news.id !== featuredId);
        }
        
        setFeaturedNews(featuredNewsData.length > 0 ? featuredNewsData[0] : null);
        setOtherNews(filteredOtherNews.slice(0, 3)); // Limit to 3 items
      } catch (error) {
        console.error("Error fetching news:", error);
        setFeaturedNews(null);
        setOtherNews([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNews();
  }, []);

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

  // Calculate read time (simplified)
  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
              {t('news.latest')}
            </span>
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            Stay informed with the latest updates and announcements from Techlympics 2025
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg animate-pulse">
                <div className="h-80 w-full bg-gray-700"></div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">More News</h3>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-4">
                  <div className="w-24 h-24 bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If no featured news is available, show a message or return null
  if (!featuredNews && (!otherNews || otherNews.length === 0)) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
              {t('news.latest')}
            </span>
          </h2>
          <p className="text-gray-300 mt-8">No news articles available at this time. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
            {t('news.latest')}
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          Stay informed with the latest updates and announcements from Techlympics 2025
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured News Column - Takes up 2/3 of the width on large screens */}
          {featuredNews && (
            <div className="lg:col-span-2">
              <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
                <div className="relative h-80 w-full">
                  <Image 
                    src={imageErrors[featuredNews.id] ? fallbackImage : (featuredNews.coverImage || fallbackImage)} 
                    alt={featuredNews.title}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(featuredNews.id)}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{featuredNews.title}</h3>
                  <p className="text-gray-300 mb-4">{featuredNews.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatDate(featuredNews.date)}</span>
                      <span className="mx-1">•</span>
                      <Clock className="h-4 w-4" />
                      <span>{featuredNews.readTime || calculateReadTime(featuredNews.content)}</span>
                    </div>
                    <Link 
                      href={`/news/${featuredNews.id}`} 
                      className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                    >
                      {t('news.readMore')} <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Other News Column - Takes up 1/3 of the width on large screens */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">More News</h3>
            {otherNews.map((news) => (
              <div key={news.id} className="flex space-x-4 group">
                <div className="relative w-24 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  <Image 
                    src={imageErrors[news.id] ? fallbackImage : (news.coverImage || fallbackImage)} 
                    alt={news.title}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(news.id)}
                  />
                </div>
                <div className="flex-1">
                  <Link href={`/news/${news.id}`} className="block">
                    <h4 className="font-semibold group-hover:text-blue-400 transition-colors">{news.title}</h4>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{news.excerpt}</p>
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="text-center mt-8">
              <Link 
                href="/news" 
                className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t('news.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
