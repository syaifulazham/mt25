"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Sample items for fallback when no gallery photos are available
const sampleItems = [
  { 
    id: 1, 
    gradient: "from-blue-500 to-purple-600", 
    title: "Techlympics Competition",
    description: "Students showcasing their tech projects"
  },
  { 
    id: 2, 
    gradient: "from-red-500 to-orange-500", 
    title: "Coding Challenge",
    description: "Participants in an intense coding competition"
  },
  { 
    id: 3, 
    gradient: "from-green-500 to-teal-500", 
    title: "Robotics Showcase",
    description: "Next-gen robots built by talented students"
  },
  { 
    id: 4, 
    gradient: "from-purple-500 to-pink-500", 
    title: "Innovation Awards",
    description: "Celebrating achievement in technology"
  },
  { 
    id: 5, 
    gradient: "from-yellow-400 to-amber-600", 
    title: "Tech Workshops",
    description: "Learning new skills from industry experts"
  }
];

// Types
type Photo = {
  id: number;
  path: string;
  title?: string;
  description?: string;
  sortOrder: number;
  galleryId: number;
  createdAt: string;
  updatedAt: string;
};

// Fallback image for when actual images are missing
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
  
  // Add a cache-busting parameter to force refresh of images
  return `${path}?t=${Date.now()}`;
};

// Get random items from an array
const getRandomItems = (array: any[], count: number) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export default function GalleryCarousel() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);

  // Effect for auto-sliding
  useEffect(() => {
    if (isPaused) return;
    
    const slideInterval = setInterval(() => {
      setCurrentIndex(prev => (prev === (photos.length || sampleItems.length) - 1 ? 0 : prev + 1));
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(slideInterval);
  }, [photos.length, currentIndex, isPaused]);
  
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        
        // Fetch photos from our public API endpoint
        const response = await fetch('/api/public/gallery-photos?limit=5');
        
        if (!response.ok) {
          throw new Error(`Gallery photos API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we got valid photos back
        if (Array.isArray(data) && data.length > 0) {
          setPhotos(data);
        } else {
          // Use sample placeholders as fallback
          console.log('No gallery photos found, using placeholders');
          setPhotos([]);
        }
      } catch (error) {
        console.error("Error fetching photos for carousel:", error);
        // Use empty array on error, we'll show placeholders
        setPhotos([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPhotos();
  }, []);



  const handlePrev = () => {
    setIsPaused(true); // Pause auto-sliding when manually navigating
    setCurrentIndex((prev) => {
      const total = photos.length || sampleItems.length;
      return prev === 0 ? total - 1 : prev - 1;
    });
  };

  const handleNext = () => {
    setIsPaused(true); // Pause auto-sliding when manually navigating
    setCurrentIndex((prev) => {
      const total = photos.length || sampleItems.length;
      return prev === total - 1 ? 0 : prev + 1;
    });
  };

  const handleImageError = (id: string | number) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };

  // Show loading state while photos are being fetched
  if (isLoading) {
    return (
      <div className="md:w-1/2 relative">
        <div className="w-full h-64 md:h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl relative overflow-hidden shadow-2xl animate-pulse">
          <div className="absolute inset-0 bg-black opacity-30"></div>
        </div>
      </div>
    );
  }

  // If no photos from the API, show a carousel with gradient placeholders
  if (photos.length === 0) {
    return (
      <div className="md:w-1/2 relative">
        <div className="w-full h-64 md:h-96 rounded-2xl relative overflow-hidden shadow-2xl">
          {/* Carousel for placeholders */}
          <div 
            className="relative w-full h-full group hover:cursor-pointer" 
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {sampleItems.map((item, index) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}>
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                </div>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-white text-sm md:text-base opacity-80 max-w-md">{item.description}</p>
                </div>
              </div>
            ))}
            
            {/* Navigation arrows */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
              {sampleItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentIndex ? "bg-white" : "bg-white/40"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:w-full relative">
      <div className="w-full h-64 md:h-96 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        {/* Carousel */}
        <div 
          className="relative w-full h-full group hover:cursor-pointer" 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <Image
                src={imageErrors[photo.id] ? fallbackImage : normalizeImagePath(photo.path)}
                alt={photo.title || "Gallery photo"}
                fill
                className="object-cover"
                onError={() => handleImageError(photo.id)}
                priority={index === currentIndex}
                unoptimized={true} // Use unoptimized to bypass image optimization issues
              />
              
              {photo.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white text-sm md:text-base font-medium">{photo.title}</p>
                  {photo.description && (
                    <p className="text-white/80 text-xs md:text-sm">{photo.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Navigation arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          {/* Dots indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/40"
                }`}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
