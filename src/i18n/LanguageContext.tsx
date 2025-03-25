import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { SupportedLanguage, TranslationKeys } from './types';

// Import all language files
import en from './locales/en.json';
import fi from './locales/fi.json';

// Map of all available translations
const translations: Record<SupportedLanguage, TranslationKeys> = {
  en,
  fi,
};

// Define the Language Context type
interface LanguageContextType {
  language: SupportedLanguage;
  t: (key: string, params?: Record<string, any>) => string;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
  isRTL: boolean;
  availableLanguages: { code: SupportedLanguage; name: string }[];
}

// Create the Language Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language storage key
const LANGUAGE_STORAGE_KEY = 'lexielearn_ui_language';

// Available languages with display names
const availableLanguages = [
  { code: 'en' as SupportedLanguage, name: 'English' },
  { code: 'fi' as SupportedLanguage, name: 'Suomi' },
];

// Determine default locale and ensure it's one of our supported languages
const getDefaultLocale = (): SupportedLanguage => {
  try {
    // Try getting locale from expo-localization
    const locale = Localization.locale.split('-')[0];
    // Check if the locale is supported, otherwise fall back to 'en'
    return (locale === 'en' || locale === 'fi') ? locale as SupportedLanguage : 'en';
  } catch (error) {
    console.warn('expo-localization not available, using default: en');
    return 'en';
  }
};

// Language Provider component
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(getDefaultLocale());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language preference on initial mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'fi')) {
          setLanguage(savedLanguage);
        } else {
          // Use device language if available and supported, otherwise default to English
          const deviceLanguage = 
            (Localization?.locale || '').split('-')[0] as SupportedLanguage;
          if (deviceLanguage && translations[deviceLanguage]) {
            setLanguage(deviceLanguage);
          }
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadLanguagePreference();
  }, []);

  // Translation function that accepts a dot-separated path to a translation
  const t = (key: string, params?: Record<string, any>): string => {
    // If translations aren't loaded yet, return empty string to avoid errors
    if (!isLoaded) return '';

    // Split the key by dots to navigate the nested structure
    const keys = key.split('.');
    let value: any = translations[language];

    // Navigate through the nested structure
    for (const k of keys) {
      value = value?.[k];
      
      // If the value is undefined at any point, return the key itself
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Return the found translation (or the key if the value is not a string)
    let translation = typeof value === 'string' ? value : key;
    
    // Handle parameter substitution if params are provided
    if (params && typeof translation === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return translation;
  };

  // Function to change the language
  const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguage(lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  // Check if the current language is RTL (for future support)
  const isRTL = false; // No RTL languages currently supported

  // Provide the language context
  const contextValue: LanguageContextType = {
    language,
    t,
    changeLanguage,
    isRTL,
    availableLanguages,
  };

  // Only render children when language is loaded
  if (!isLoaded) {
    return null; // Or a loading indicator
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}; 