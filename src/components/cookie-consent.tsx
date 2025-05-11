"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";

type CookieConsentPreferences = {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  timestamp: number;
};

const COOKIE_CONSENT_KEY = "techlympics-cookie-consent";

export function CookieConsent() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentPreferences>({
    essential: true, // Essential cookies are always required
    functional: false,
    analytics: false,
    timestamp: 0,
  });

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!consent) {
      // No consent found, show banner after a small delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Parse saved preferences
      try {
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
      } catch (error) {
        console.error("Error parsing cookie consent:", error);
        setIsVisible(true);
      }
    }
  }, []);

  const acceptAll = () => {
    const newPreferences: CookieConsentPreferences = {
      essential: true,
      functional: true,
      analytics: true,
      timestamp: Date.now(),
    };
    
    setPreferences(newPreferences);
    saveConsent(newPreferences);
    setIsVisible(false);
  };

  const acceptEssential = () => {
    const newPreferences: CookieConsentPreferences = {
      essential: true,
      functional: false,
      analytics: false,
      timestamp: Date.now(),
    };
    
    setPreferences(newPreferences);
    saveConsent(newPreferences);
    setIsVisible(false);
  };

  const savePreferences = () => {
    const updatedPreferences = {
      ...preferences,
      timestamp: Date.now(),
    };
    
    saveConsent(updatedPreferences);
    setShowPreferences(false);
    setIsVisible(false);
  };

  const saveConsent = (prefs: CookieConsentPreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    
    // Here you would implement the actual cookie settings
    // For example, if analytics is false, you might disable Google Analytics
    if (!prefs.analytics) {
      // Disable analytics cookies
      // Example: window['ga-disable-UA-XXXXXXXX-X'] = true;
    }
    
    // If functional cookies are disabled, you might need to clear those
    if (!prefs.functional) {
      // Clear functional cookies
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 border-t bg-background shadow-lg animate-in slide-in-from-bottom">
      <div className="container mx-auto">
        {!showPreferences ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t('cookies.title')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('cookies.description')}
              </p>
              <Link href="/policies/cookies" className="text-xs text-primary hover:underline">
                {t('cookies.learnMore')}
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreferences(true)}
                className="flex-1 sm:flex-initial"
              >
                {t('cookies.preferences')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={acceptEssential}
                className="flex-1 sm:flex-initial"
              >
                {t('cookies.essentialOnly')}
              </Button>
              <Button 
                size="sm" 
                onClick={acceptAll}
                className="flex-1 sm:flex-initial"
              >
                {t('cookies.acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button 
              className="absolute right-0 top-0 p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPreferences(false)}
            >
              <X size={20} />
            </button>
            
            <div className="space-y-4 pb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{t('cookies.preferencesTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('cookies.preferencesDescription')}
                </p>
              </div>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <h4 className="font-medium">{t('cookies.essential')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('cookies.essentialDescription')}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={preferences.essential} 
                      disabled
                      className="h-4 w-4 rounded border-gray-300 cursor-not-allowed"
                    />
                    <span className="text-xs text-muted-foreground ml-2">{t('cookies.alwaysActive')}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <h4 className="font-medium">{t('cookies.functional')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('cookies.functionalDescription')}
                    </p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.functional} 
                    onChange={(e) => setPreferences({...preferences, functional: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <h4 className="font-medium">{t('cookies.analytics')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('cookies.analyticsDescription')}
                    </p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.analytics} 
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowPreferences(false)}>
                  {t('cookies.cancel')}
                </Button>
                <Button size="sm" onClick={savePreferences}>
                  {t('cookies.save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
