"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Camera, ArrowRight } from "lucide-react";
export const dynamic = 'force-dynamic';

// PhotoGallery type definition
type PhotoGallery = {
  id: string;
  title: string;
  description: string;
  coverPhoto?: string;
  isPublished: boolean;
  photos?: Photo[];
  createdAt: string;
};

type Photo = {
  id: string;
  url: string;
  caption?: string;
  sortOrder: number;
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

export default function GallerySection() {
  const { t } = useLanguage();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [galleries, setGalleries] = useState<PhotoGallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch galleries data
  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        setIsLoading(true);
        
        // Fetch published galleries
        const response = await fetch('/api/photo-galleries?publishedOnly=true&pageSize=6');
        
        if (!response.ok) {
          throw new Error(`Galleries API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both array and paginated response formats
        const galleriesData = Array.isArray(data) 
          ? data 
          : data.data || [];
        
        setGalleries(galleriesData);
      } catch (error) {
        console.error("Error fetching galleries:", error);
        setGalleries([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGalleries();
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

  // Show loading skeleton
  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
              {t('gallery.title') || 'Photo Gallery'}
            </span>
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            {t('gallery.description') || 'Explore moments captured during Techlympics events and activities'}
          </p>
          
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
        </div>
      </section>
    );
  }

  // If no galleries available, show a message or return null
  if (!galleries || galleries.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
              {t('gallery.title') || 'Photo Gallery'}
            </span>
          </h2>
          <p className="text-gray-300 mt-8">No photo galleries available at this time. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-purple-500 to-blue-500">
            {t('gallery.title') || 'Photo Gallery'}
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          {t('gallery.description') || 'Explore moments captured during Techlympics events and activities'}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleries.map((gallery) => (
            <div key={gallery.id} className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all group transform hover:-translate-y-1 duration-300">
              <div className="relative h-48 w-full">
                {gallery.coverPhoto ? (
                  <Image 
                    src={imageErrors[gallery.id] ? fallbackImage : normalizeImagePath(gallery.coverPhoto)} 
                    alt={gallery.title}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(gallery.id)}
                    unoptimized={gallery.coverPhoto?.startsWith('data:') || false}
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
                  <div className="text-gray-400 text-sm">
                    {formatDate(gallery.createdAt)}
                  </div>
                  <Link 
                    href={`/gallery/${gallery.id}`} 
                    className="text-blue-400 hover:text-blue-300 flex items-center transition-colors group-hover:translate-x-1 transform duration-300"
                  >
                    {t('gallery.viewGallery') || 'View Gallery'} <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {galleries.length > 5 && (
          <div className="text-center mt-10">
            <Link 
              href="/gallery" 
              className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors hover:underline-offset-4 hover:underline"
            >
              {t('gallery.viewAll') || 'View All Galleries'} <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
