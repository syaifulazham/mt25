"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Trophy, Users, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

// Announcement type definition
type Announcement = {
  id: string;
  title: string;
  description: string;
  date: string;
  link?: string;
  linkText?: string;
  isActive: boolean;
  icon?: string;
  createdBy?: {
    id: string;
    name: string;
    username: string;
  };
};

// Icon mapping
const iconMap: Record<string, JSX.Element> = {
  calendar: <CalendarDays className="w-10 h-10 text-red-400" />,
  map: <MapPin className="w-10 h-10 text-green-400" />,
  trophy: <Trophy className="w-10 h-10 text-yellow-400" />,
  users: <Users className="w-10 h-10 text-blue-400" />,
};

export default function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch announcements data
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true);
        
        // Fetch active announcements
        const response = await fetch('/api/announcements?activeOnly=true&pageSize=4');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both array and paginated response formats
        const announcementsData = Array.isArray(data) ? data : data.data || [];
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, []);

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

  // Get icon based on icon name or default to users icon
  const getIcon = (iconName?: string) => {
    if (!iconName) return iconMap.users;
    return iconMap[iconName.toLowerCase()] || iconMap.users;
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-500">
              Latest Announcements
            </span>
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            Stay updated with the latest news and announcements for Techlympics 2025
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-full bg-gray-900 flex-shrink-0 h-16 w-16"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                    </div>
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If no announcements are available, show a message or return null
  if (!announcements || announcements.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-500">
              Latest Announcements
            </span>
          </h2>
          <p className="text-gray-300 mt-8">No announcements available at this time. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-500">
            Latest Announcements
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          Stay updated with the latest news and announcements for Techlympics 2025
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-900/20"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-full bg-gray-900 flex-shrink-0">
                  {getIcon(announcement.icon)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white mb-2">{announcement.title}</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                      {formatDate(announcement.date)}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{announcement.description}</p>
                  {announcement.link && (
                    <Link 
                      href={announcement.link} 
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {announcement.linkText || "Learn More"}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 text-center">
          <Link 
            href="/announcements" 
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all text-white font-medium"
          >
            View All Announcements
          </Link>
        </div>
      </div>
    </section>
  );
}
