import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ChevronLeft, ChevronRight, Brain } from 'lucide-react-native';
import theme from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from '../i18n/LanguageContext';

type ConceptCardScreenProps = NativeStackScreenProps<RootStackParamList, 'ConceptCardScreen'>;

type ConceptCard = {
  card_number: number;
  title: string;
  explanation: string;
  hint: string;
};

const FONT_SETTINGS_KEY = 'global_font_settings';
const { width } = Dimensions.get('window');
const cardWidth = width - 48; // 24px padding on each side

export default function ConceptCardScreen({ route, navigation }: ConceptCardScreenProps) {
  const { t } = useTranslation();
  console.log('[ConceptCardScreen] Component rendering');
  
  const { cards, title } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  
  // Animation value for swipe functionality
  const pan = useRef(new Animated.Value(0)).current;
  
  // Add font settings state
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  
  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
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
  
  // Function to handle index changes
  const handleIndexChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
  };
  
  // Add these animation helper functions near the top of your component
  // Add animation helper functions to reduce duplicate code
  const animateCardSwipe = (direction: 'left' | 'right', callback?: () => void) => {
    // Direction is 'left' for next card, 'right' for previous card
    const toValue = direction === 'left' ? -cardWidth : cardWidth;
    
    Animated.timing(pan, {
      toValue,
      duration: 180,
      useNativeDriver: true, // Using native driver for better performance
    }).start(() => {
      pan.setValue(0); // Reset
      if (callback) callback();
    });
  };

  const animateCardReset = () => {
    Animated.spring(pan, {
      toValue: 0,
      tension: 40,     // Consistent tension value
      friction: 7,     // Keeps animation bouncy
      useNativeDriver: true, // Using native driver for better performance
    }).start();
  };

  // Update goToNextCard and goToPreviousCard to use the helper functions
  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      animateCardSwipe('left', () => handleIndexChange(currentIndex + 1));
    }
  };

  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      animateCardSwipe('right', () => handleIndexChange(currentIndex - 1));
    }
  };

  // Then update the PanResponder to use these functions
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only respond to horizontal gestures that are significant
        return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        pan.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        // Add resistance as we move further - this makes it feel more natural
        const dx = gesture.dx;
        // Add resistance as we move further from center
        const resistanceFactor = Math.min(1, Math.abs(dx) / (cardWidth * 0.5));
        pan.setValue(dx * resistanceFactor);
      },
      onPanResponderRelease: (_, gesture) => {
        const currentIdx = currentIndexRef.current;
        const swipeThreshold = 80; // Slightly reduced threshold for easier swiping
        
        if (gesture.dx > swipeThreshold && currentIdx > 0) {
          // Right swipe - previous card
          animateCardSwipe('right', () => handleIndexChange(currentIdx - 1));
        } else if (gesture.dx < -swipeThreshold && currentIdx < cards.length - 1) {
          // Left swipe - next card
          animateCardSwipe('left', () => handleIndexChange(currentIdx + 1));
        } else {
          // Not a significant swipe, bounce back to center
          animateCardReset();
        }
      },
      onPanResponderTerminate: () => {
        // Reset animation if gesture is terminated
        animateCardReset();
      },
    })
  ).current;
  
  // Create markdown styles based on font settings
  const getMarkdownStyles = () => {
    return {
      body: {
        color: theme.colors.text,
        fontSize: fontSettings.size,
        fontFamily: getFontFamily(),
        lineHeight: Math.round(fontSettings.size * 1.5), // Proportional line height
      },
      paragraph: {
        marginBottom: 16,
        color: theme.colors.text,
        fontSize: fontSettings.size,
        fontFamily: getFontFamily(),
        lineHeight: Math.round(fontSettings.size * 1.5),
        textTransform: fontSettings.isAllCaps ? 'uppercase' : 'none',
      },
      bullet_list: {
        marginBottom: 16,
      },
      ordered_list: {
        marginBottom: 16,
      },
      bullet_list_item: {
        marginBottom: 8,
      },
      ordered_list_item: {
        marginBottom: 8,
      },
      bullet_list_icon: {
        marginRight: 8,
      },
      heading1: {
        fontSize: fontSettings.size + 6,
        fontWeight: 'bold',
        marginBottom: 16,
        color: theme.colors.text,
        fontFamily: getFontFamily(),
        textTransform: fontSettings.isAllCaps ? 'uppercase' : 'none',
      },
      heading2: {
        fontSize: fontSettings.size + 4,
        fontWeight: 'bold',
        marginBottom: 12,
        color: theme.colors.text,
        fontFamily: getFontFamily(),
        textTransform: fontSettings.isAllCaps ? 'uppercase' : 'none',
      },
      code_block: {
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
      },
      code_inline: {
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
      },
      fence: {
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: '#3A3A3C',
        paddingLeft: 12,
        marginLeft: 0,
        marginBottom: 16,
      }
    };
  };
  
  // Replace the existing renderParagraphs with a markdown renderer
  const renderMarkdownContent = (text: string) => {
    if (!text) return null;
    
    // Convert basic newlines to markdown line breaks for better compatibility
    const formattedText = text
      // Add a blank line after each newline for proper paragraph breaks
      .replace(/\n/g, '\n\n')
      // Convert standalone bullet markers to proper markdown bullets
      .replace(/^[•-]\s/gm, '* ')
      // Ensure proper spacing for existing markdown bullets
      .replace(/^\*/gm, '* ')
      // Ensure proper spacing for numbered lists
      .replace(/^(\d+)[.)] /gm, '$1. ');
      
    return (
      <Markdown style={getMarkdownStyles()}>
        {formattedText}
      </Markdown>
    );
  };
  
  // Guard against empty cards array
  if (!cards || cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerText}>{t('flashcards.title')}</Text>
          <View style={styles.placeholderRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('conceptCards.noCards')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const currentCard: ConceptCard = cards[currentIndex];
  
  // Calculate rotation based on swipe position
  const rotationInterpolation = pan.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-3deg', '0deg', '3deg'],
    extrapolate: 'clamp',
  });
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('flashcards.title')}</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      {/* Card Content with swipe functionality */}
      <View style={styles.cardContainer}>
        {/* Swipeable card */}
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              transform: [
                { translateX: pan },
                { rotate: rotationInterpolation }
              ]
            }
          ]}
        >
          <View style={styles.cardContent}>
            <Text style={getTextStyle(styles.cardTitle)}>{currentCard.title}</Text>
            
            {/* Replace paragraph rendering with markdown */}
            <View style={styles.explanationContainer}>
              {renderMarkdownContent(currentCard.explanation)}
            </View>
            
            {/* Main content area */}
            <View style={styles.cardMainContent}>
              {/* Content goes here if needed */}
            </View>
            
            {/* Hint Section */}
            <View style={styles.hintContainer}>
              <View style={styles.hintHeader}>
                <Text style={styles.hintLabel}>{t('conceptCards.hint')}</Text>
                <Brain color={theme.colors.textSecondary} size={16} />
              </View>
              {/* Also use markdown for the hint */}
              {renderMarkdownContent(currentCard.hint)}
            </View>
            
            {/* Card Navigation */}
            <View style={styles.cardNavigation}>
              <Text style={styles.paginationText}>
                {t('conceptCards.counter', { current: currentIndex + 1, total: cards.length })}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
      
      {/* Navigation Buttons - Update to use chevron icons */}
      <View style={styles.buttonContainer}>
        {/* Previous button with ChevronLeft */}
        <View style={styles.buttonSlot}>
          {currentIndex > 0 && (
            <TouchableOpacity onPress={goToPreviousCard} style={styles.circleButton}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Next button with ChevronRight */}
        <View style={styles.buttonSlot}>
          {currentIndex < cards.length - 1 && (
            <TouchableOpacity onPress={goToNextCard} style={styles.circleButton}>
              <ChevronRight color="white" size={24} />
            </TouchableOpacity>
          )}
        </View>
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
    width: 40, 
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
    position: 'relative',
  },
  card: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  cardMainContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 24,
    lineHeight: 22,
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
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    width: '100%',
  },
  buttonSlot: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  explanationContainer: {
    marginBottom: 24,
  },
  paragraphSpacing: {
    marginBottom: 16,
  },
  bulletPoint: {
    paddingLeft: 8,
  },
}); 