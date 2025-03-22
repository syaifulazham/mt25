"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";

// Mock news data - this would be replaced with data from the API/database in the future
const featuredNews = {
  id: 1,
  title: "Techlympics 2025 Announces Partnership with Major Tech Companies",
  excerpt: "Techlympics 2025 has secured partnerships with leading technology companies to provide resources, mentorship, and prizes for participants.",
  content: "Techlympics 2025 has secured partnerships with leading technology companies to provide resources, mentorship, and prizes for participants. These partnerships will enhance the competition experience and provide valuable opportunities for participants to showcase their skills to potential employers.",
  coverImage: "/images/news/partnership.jpg",
  date: "March 18, 2025",
  readTime: "4 min read",
  author: "Techlympics Organizing Committee",
  featured: true,
  slug: "techlympics-2025-announces-partnership"
};

const otherNews = [
  {
    id: 2,
    title: "New AI Challenge Added to Techlympics 2025",
    excerpt: "A new artificial intelligence challenge has been added to the Techlympics 2025 competition lineup.",
    coverImage: "/images/news/ai-challenge.jpg",
    date: "March 15, 2025",
    readTime: "3 min read",
    slug: "new-ai-challenge-added"
  },
  {
    id: 3,
    title: "Techlympics 2025 Workshop Schedule Released",
    excerpt: "The schedule for pre-competition workshops and training sessions has been released.",
    coverImage: "/images/news/workshops.jpg",
    date: "March 10, 2025",
    readTime: "2 min read",
    slug: "workshop-schedule-released"
  },
  {
    id: 4,
    title: "International Participants Expected to Join Techlympics 2025",
    excerpt: "Participants from neighboring countries are expected to join the competition this year.",
    coverImage: "/images/news/international.jpg",
    date: "March 5, 2025",
    readTime: "3 min read",
    slug: "international-participants-expected"
  },
  {
    id: 5,
    title: "Techlympics 2025 Introduces New Judging Criteria",
    excerpt: "The judging criteria for all competitions have been updated to better assess technical skills and innovation.",
    coverImage: "/images/news/judging.jpg",
    date: "February 28, 2025",
    readTime: "4 min read",
    slug: "new-judging-criteria"
  }
];

// Fallback image for when the actual image is missing
const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='20' text-anchor='middle' alignment-baseline='middle' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function NewsSection() {
  // State to track image loading errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Handle image error
  const handleImageError = (id: number) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };

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
          <div className="lg:col-span-2">
            <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
              <div className="relative h-80 w-full">
                <Image 
                  src={imageErrors[featuredNews.id] ? fallbackImage : featuredNews.coverImage} 
                  alt={featuredNews.title}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(featuredNews.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <div className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>{featuredNews.date}</span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4" />
                    <span>{featuredNews.readTime}</span>
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
          
          {/* Other News Column - Takes up 1/3 of the width on large screens */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">More News</h3>
            
            {otherNews.slice(0, 3).map((news) => (
              <div key={news.id} className="flex space-x-4 group">
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden relative">
                  <Image 
                    src={imageErrors[news.id] ? fallbackImage : news.coverImage} 
                    alt={news.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => handleImageError(news.id)}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                    <span>{news.date}</span>
                    <span>•</span>
                    <span>{news.readTime}</span>
                  </div>
                  <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    <Link href={`/news/${news.slug}`}>{news.title}</Link>
                  </h4>
                </div>
              </div>
            ))}
            
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
