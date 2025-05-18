"use client";

import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useLanguage, Language } from "@/lib/i18n/language-context";
import { setCookie, getCookie } from "@/lib/i18n/cookies";
import { useRouter } from "next/navigation";

const languages: { code: Language; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "my", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "fil", name: "Filipino", flag: "🇵🇭" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

interface LanguageSelectorProps {
  variant?: "icon" | "full";
  className?: string;
}

export function LanguageSelector({ variant = "full", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const currentLanguage = languages.find((lang) => lang.code === language);

  // Handle language change and reload the page to apply changes
  const handleLanguageChange = (lang: Language) => {
    // First, directly set the cookie with path to ensure it's accessible across the site
    document.cookie = `language=${lang};path=/;max-age=${60*60*24*365}`;
    
    // Then update the language context state
    setLanguage(lang);
    
    // Log for debugging
    console.log(`Language changed to: ${lang}`);
    console.log(`Cookie set: ${document.cookie}`);
    
    // Force a full page reload to apply the new language
    setTimeout(() => {
      window.location.href = window.location.pathname + window.location.search;
    }, 50);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className={`flex items-center gap-2 font-normal ${className} cursor-pointer px-3 py-1.5 rounded hover:bg-accent hover:bg-opacity-20 transition-colors`}
          data-testid="language-selector"
        >
          {variant === "full" && currentLanguage ? (
            <>
              <span className="mr-1">{currentLanguage.flag}</span>
              <span className="text-xs hidden sm:inline">{currentLanguage.name}</span>
            </>
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent 
          align="end" 
          sideOffset={5} 
          className="z-[60] w-[180px] animate-in fade-in-20 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1" 
          forceMount
        >
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
              {language === lang.code && <Check className="h-4 w-4 ml-2" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
