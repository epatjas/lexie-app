import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ChevronLeft, StepForward, Volume2 as VolumeIcon, Brain } from 'lucide-react-native';
import theme from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';

type ConceptCardScreenProps = NativeStackScreenProps<RootStackParamList, 'ConceptCardScreen'>;

type ConceptCard = {
  card_number: number;
  title: string;
  explanation: string;
  hint: string;
};

const FONT_SETTINGS_KEY = 'global_font_settings';

export default function ConceptCardScreen({ route, navigation }: ConceptCardScreenProps) {
  console.log('[ConceptCardScreen] Component rendering');
  
  const { cards, title } = route.params;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  // Add font settings state
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  
  // Load font settings when component mounts
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(FONT_SETTINGS_KEY);
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          console.log('Loaded font settings:', parsedSettings);
          setFontSettings(parsedSettings);
        }
      } catch (error) {
        console.error('[ConceptCardScreen] Error loading font settings:', error);
      }
    };
    
    loadFontSettings();
  }, []);
  
  // Helper function to get the font family based on settings
  const getFontFamily = () => {
    switch (fontSettings.font) {
      case 'Reading': return 'Georgia';
      case 'Dyslexia-friendly': return 'OpenDyslexic';
      case 'High-visibility': return 'AtkinsonHyperlegible';
      case 'Monospaced': return 'IBMPlexMono';
      default: return theme.fonts.regular;
    }
  };
  
  // Helper function to apply font settings to text styles
  const getTextStyle = (baseStyle: any) => {
    const textTransformValue = fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const;
    
    return {
      ...baseStyle,
      fontFamily: getFontFamily(),
      fontSize: baseStyle.fontSize ? 
        (baseStyle.fontSize - theme.fontSizes.md) + fontSettings.size : 
        fontSettings.size,
      textTransform: textTransformValue,
    };
  };
  
  // Guard against empty cards array
  if (!cards || cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Learn</Text>
          <View style={styles.placeholderRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No concept cards available.</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const currentCard: ConceptCard = cards[currentIndex];
  
  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  useEffect(() => {
    console.log('[ConceptCardScreen] Current font settings:', fontSettings);
  }, [fontSettings]);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header - with ORIGINAL styling */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{title}</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          {/* Apply custom styling ONLY to content elements */}
          <Text style={getTextStyle(styles.cardTitle)}>{currentCard.title}</Text>
          <Text style={getTextStyle(styles.cardSubtitle)}>{currentCard.explanation}</Text>
          
          {/* Main content area */}
          <View style={styles.cardContent}>
            {/* Content goes here if needed */}
          </View>
          
          {/* Hint Section - with mixed styling */}
          <View style={styles.hintContainer}>
            <View style={styles.hintHeader}>
              {/* Keep the label as UI element with original styling */}
              <Text style={styles.hintLabel}>Hint</Text>
              <Brain color={theme.colors.textSecondary} size={16} />
            </View>
            {/* Apply custom styling to hint content */}
            <Text style={getTextStyle(styles.hintText)}>{currentCard.hint}</Text>
          </View>
          
          {/* Card Navigation - with ORIGINAL styling */}
          <View style={styles.cardNavigation}>
            <Text style={styles.paginationText}>
              {currentIndex + 1} / {cards.length}
            </Text>
            <TouchableOpacity onPress={() => {/* Sound function */}}>
              <VolumeIcon color={theme.colors.text} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Next Button - with ORIGINAL styling but centered */}
      <View style={styles.buttonContainer}>
        {currentIndex > 0 && (
          <TouchableOpacity onPress={goToPreviousCard} style={[styles.circleButton, {marginRight: 16}]}>
            <StepForward color="white" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        )}
        
        {currentIndex < cards.length - 1 && (
          <TouchableOpacity onPress={goToNextCard} style={styles.circleButton}>
            <StepForward color="white" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholderRight: {
    width: 40, // Match width of back button for proper centering
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  card: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 24,
    lineHeight: 22,
  },
  cardContent: {
    flex: 1,
  },
  hintContainer: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hintLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  hintText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  cardNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  paginationText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
  },
  circleButton: {
    width: 96,
    height: 96,
    borderRadius: 64,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 