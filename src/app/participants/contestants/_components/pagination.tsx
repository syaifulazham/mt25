"use client";

import React from 'react';
import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: PaginationProps) {
  const { t } = useLanguage(); // Initialize language context
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // If we have 5 or fewer pages, show all of them
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first and last page
      // Show current page and one page before and after when possible
      
      // Start with page 1
      pageNumbers.push(1);
      
      // Calculate range around current page
      let rangeStart = Math.max(2, currentPage - 1);
      let rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range to always show 3 pages when possible
      if (rangeEnd - rangeStart < 2) {
        if (rangeStart === 2) {
          rangeEnd = Math.min(totalPages - 1, rangeStart + 2);
        } else if (rangeEnd === totalPages - 1) {
          rangeStart = Math.max(2, rangeEnd - 2);
        }
      }
      
      // Add ellipsis after page 1 if needed
      if (rangeStart > 2) {
        pageNumbers.push("...");
      }
      
      // Add range pages
      for (let i = rangeStart; i <= rangeEnd; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (rangeEnd < totalPages - 1) {
        pageNumbers.push("...");
      }
      
      // Add last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title={t('pagination.first_page')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title={t('pagination.previous_page')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {getPageNumbers().map((page, index) => (
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2">...</span>
          ) : (
            <Button
              key={`page-${page}`}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page as number)}
              className="w-9"
            >
              {page}
            </Button>
          )
        ))}
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title={t('pagination.next_page')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title={t('pagination.last_page')}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
