"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, User } from "lucide-react";
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

export default function GalleryDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const galleryId = params.id as string;
  
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Fetch gallery data
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch gallery details
        const galleryResponse = await fetch(`/api/public/gallery/${galleryId}`);
        
        if (!galleryResponse.ok) {
          if (galleryResponse.status === 404) {
            throw new Error("Gallery not found");
          }
          throw new Error(`Gallery API error: ${galleryResponse.status}`);
        }
        
        const galleryData = await galleryResponse.json();
        setGallery(galleryData);
        
        // Fetch gallery photos
        const photosResponse = await fetch(`/api/public/gallery/${galleryId}/photos`);
        
        if (!photosResponse.ok) {
          throw new Error(`Photos API error: ${photosResponse.status}`);
        }
        
        const photosData = await photosResponse.json();
        setPhotos(Array.isArray(photosData) ? photosData : []);
      } catch (error: any) {
        console.error("Error fetching gallery data:", error);
        setError(error.message || "Failed to load gallery");
        setGallery(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (galleryId) {
      fetchGalleryData();
    }
  }, [galleryId]);
  
  const handleImageError = (id: number) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };
  
  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
  };
  
  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  };
  
  const goToPrevPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };
  
  const goToNextPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };
  
  // Handle keyboard navigation in lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevPhoto();
          break;
        case 'ArrowRight':
          goToNextPhoto();
          break;
        case 'Escape':
          closeLightbox();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen]);
  
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
        <Link href="/gallery" className="inline-flex items-center text-gray-300 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('gallery.backToGalleries') || 'Back to All Galleries'}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-48 bg-gray-700 rounded-md animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="max-w-4xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t('gallery.errorLoading') || 'Error Loading Gallery'}</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link 
              href="/gallery" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-colors"
            >
              {t('gallery.returnToGalleries') || 'Return to Galleries'}
            </Link>
          </div>
        ) : gallery ? (
          // Gallery Detail
          <div className="max-w-6xl mx-auto">
            {/* Gallery header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{gallery.title}</h1>
              
              <div className="flex flex-wrap items-center text-gray-300 text-sm gap-4 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDate(gallery.createdAt)}</span>
                </div>
                {gallery.user && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{gallery.user.name}</span>
                  </div>
                )}
              </div>
              
              {gallery.description && (
                <p className="text-gray-300 max-w-3xl mb-6">{gallery.description}</p>
              )}
            </header>
            
            {/* Photos grid */}
            {photos.length === 0 ? (
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-10 text-center">
                <p className="text-gray-300">{t('gallery.noPhotos') || 'No photos in this gallery yet.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    onClick={() => openLightbox(index)}
                  >
                    <div className="relative h-48">
                      <Image 
                        src={imageErrors[photo.id] ? fallbackImage : normalizeImagePath(photo.path)}
                        alt={photo.title || `Photo ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={() => handleImageError(photo.id)}
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                    {photo.title && (
                      <div className="p-3">
                        <h3 className="text-sm font-medium truncate">{photo.title}</h3>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Gallery not found state
          <div className="max-w-4xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t('gallery.notFound') || 'Gallery Not Found'}</h2>
            <p className="text-gray-300 mb-6">{t('gallery.notFoundDesc') || 'The gallery you are looking for does not exist or has been removed.'}</p>
            <Link 
              href="/gallery" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-colors"
            >
              {t('gallery.returnToGalleries') || 'Return to Galleries'}
            </Link>
          </div>
        )}
      </main>
      
      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
            onClick={goToPrevPhoto}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10 transition-colors"
            onClick={goToNextPhoto}
            aria-label="Next photo"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          
          <div className="w-full h-full max-w-5xl max-h-full flex flex-col items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
                <Image 
                  src={imageErrors[photos[currentPhotoIndex].id] ? fallbackImage : normalizeImagePath(photos[currentPhotoIndex].path)}
                  alt={photos[currentPhotoIndex].title || `Photo ${currentPhotoIndex + 1}`}
                  width={1200}
                  height={800}
                  className="max-h-[80vh] w-auto object-contain select-none"
                  onError={() => handleImageError(photos[currentPhotoIndex].id)}
                  priority
                  unoptimized={true} // For better lightbox performance
                />
              </div>
            </div>
            
            {(photos[currentPhotoIndex].title || photos[currentPhotoIndex].description) && (
              <div className="mt-4 text-center">
                {photos[currentPhotoIndex].title && (
                  <h3 className="text-xl font-bold text-white">{photos[currentPhotoIndex].title}</h3>
                )}
                {photos[currentPhotoIndex].description && (
                  <p className="text-gray-300 mt-1">{photos[currentPhotoIndex].description}</p>
                )}
              </div>
            )}
            
            <div className="mt-4 text-center">
              <span className="text-gray-400">
                {currentPhotoIndex + 1} / {photos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
