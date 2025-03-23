"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

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
  // State to track image loading errors
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
              Latest News
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
              Latest News
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
            Latest News
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80"></div>
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>{formatDate(featuredNews.date)}</span>
                      <span className="mx-2">•</span>
                      <Clock className="w-4 h-4" />
                      <span>{featuredNews.readTime || calculateReadTime(featuredNews.content)}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{featuredNews.title}</h3>
                    <p className="text-gray-300 mb-4 line-clamp-2">{featuredNews.excerpt}</p>
                    <Link 
                      href={`/news/${featuredNews.slug}`} 
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Read Full Story
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Other News Column - Takes up 1/3 of the width on large screens */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">More News</h3>
            
            {otherNews.length > 0 ? (
              otherNews.map((news) => (
                <div key={news.id} className="flex space-x-4 group">
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden relative">
                    <Image 
                      src={imageErrors[news.id] ? fallbackImage : (news.coverImage || fallbackImage)} 
                      alt={news.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => handleImageError(news.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                      <span>{formatDate(news.date)}</span>
                      <span>•</span>
                      <span>{news.readTime || calculateReadTime(news.content)}</span>
                    </div>
                    <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      <Link href={`/news/${news.slug}`}>{news.title}</Link>
                    </h4>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No additional news available.</p>
            )}
            
            <Link 
              href="/news" 
              className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium mt-4"
            >
              View All News
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
