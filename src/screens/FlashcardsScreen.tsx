import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, RotateCcw, X, Check, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { getFlashcardsFromStudySet } from '../services/Database';
import { Flashcard } from '../types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';
import { useTranslation } from '../i18n/LanguageContext';
import { Analytics, FeedbackType, FeatureType, EventType } from '../services/AnalyticsService';

type FlashcardsScreenProps = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

const { width } = Dimensions.get('window');
const cardWidth = width - 48; // 24px padding on each side

// Add this constant
const FONT_SETTINGS_KEY = 'global_font_settings';

export default function FlashcardsScreen({ route, navigation }: FlashcardsScreenProps) {
  const { t } = useTranslation();
  const { studySetId, filterIndices = [] } = route.params;
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnim] = useState(new Animated.Value(0));
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const pan = useRef(new Animated.Value(0)).current;
  const flashcardsRef = useRef<Flashcard[]>([]);
  const [knownCards, setKnownCards] = useState<number[]>([]);
  const [learningCards, setLearningCards] = useState<number[]>([]);

  // Add a tracking ref to help synchronize state updates
  const knownCardsRef = useRef<number[]>([]);
  const learningCardsRef = useRef<number[]>([]);
  
  // Sync the refs when the state changes
  useEffect(() => {
    knownCardsRef.current = knownCards;
    console.log("Known cards updated:", knownCards);
  }, [knownCards]);
  
  useEffect(() => {
    learningCardsRef.current = learningCards;
    console.log("Learning cards updated:", learningCards);
  }, [learningCards]);

  useEffect(() => {
    loadFlashcards();
  }, [studySetId]);

  // Keep font settings state
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  
  // Load global font settings when component mounts
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(FONT_SETTINGS_KEY);
        if (storedSettings) {
          setFontSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('[Flashcards] Error loading font settings:', error);
      }
    };
    
    loadFontSettings();
  }, []);

  const loadFlashcards = async () => {
    try {
      console.log('Loading flashcards for study set:', studySetId);
      const allCards = await getFlashcardsFromStudySet(studySetId);
      console.log('Retrieved flashcards:', allCards);
      
      if (!allCards || allCards.length === 0) {
        console.log('No flashcards found');
        return;
      }
      
      console.log('Filter indices received:', filterIndices);
      
      // Check if we have filter indices
      if (filterIndices && filterIndices.length > 0) {
        console.log('Filtering cards by indices:', filterIndices);
        
        // Convert all indices to numbers explicitly
        const numericIndices = filterIndices.map(idx => typeof idx === 'number' ? idx : Number(idx))
          .filter(idx => !isNaN(idx) && idx >= 0 && idx < allCards.length);
        
        console.log('Numeric indices after conversion:', numericIndices);
        
        if (numericIndices.length === 0) {
          console.log('No valid filter indices, showing all cards');
          setFlashcards(allCards);
          flashcardsRef.current = allCards;
          return;
        }
        
        // Get the filtered cards
        const filteredCards = numericIndices.map(idx => allCards[idx]);
        console.log(`Showing ${filteredCards.length} filtered cards out of ${allCards.length} total`);
        
        // Set the filtered cards
        setFlashcards(filteredCards);
        flashcardsRef.current = filteredCards;
        
        // Reset the tracking arrays
        setKnownCards([]);
        setLearningCards([]);
        knownCardsRef.current = [];
        learningCardsRef.current = [];
      } else {
        // No filtering, use all cards
        console.log('Using all cards');
        setFlashcards(allCards);
        flashcardsRef.current = allCards;
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  };

  // Add debug logs for state changes
  useEffect(() => {
    console.log('Current index:', currentIndex);
    console.log('Total flashcards:', flashcards.length);
  }, [currentIndex, flashcards]);

  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
    console.log('State updated - currentIndex:', currentIndex);
  }, [currentIndex]);

  // Add these new state variables
  const [cardFeedbackSubmitted, setCardFeedbackSubmitted] = useState<Record<number, boolean>>({});
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);

  // Add this function to handle flashcard feedback
  const handleFlashcardFeedback = async (isPositive: boolean) => {
    if (flashcards.length === 0) return;
    
    try {
      // Log to analytics
      await Analytics.logFeedback(
        FeedbackType.FLASHCARD_FEEDBACK,
        isPositive,
        {
          study_set_id: studySetId,
          flashcard_index: currentIndex,
          frontend_length: flashcards[currentIndex].front.length,
          backend_length: flashcards[currentIndex].back.length
        }
      );
      
      // Store feedback in AsyncStorage with modified data structure
      const feedbackData = {
        studySetId,
        flashcardIndex: currentIndex,
        flashcardFront: flashcards[currentIndex].front,
        flashcardBack: flashcards[currentIndex].back,
        isPositive,
        timestamp: new Date().toISOString(),
      };
      
      // Get existing feedback data or initialize empty array
      const existingDataJson = await AsyncStorage.getItem('flashcard_feedback') || '[]';
      const existingData = JSON.parse(existingDataJson);
      
      // Add new feedback and save back to AsyncStorage
      existingData.push(feedbackData);
      await AsyncStorage.setItem('flashcard_feedback', JSON.stringify(existingData));
      
      // Update state to mark this card's feedback as submitted
      setCardFeedbackSubmitted(prev => ({
        ...prev,
        [currentIndex]: true
      }));
      
      // Show toast
      setShowFeedbackToast(true);
      
      // Hide toast after 5 seconds
      setTimeout(() => {
        setShowFeedbackToast(false);
      }, 5000);
      
      console.log('Flashcard feedback submitted:', feedbackData);
    } catch (error) {
      console.error('Error saving flashcard feedback:', error);
    }
  };

  // Modify the handleIndexChange function to ensure we handle feedback state correctly
  const handleIndexChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    setIsFlipped(false);  // Always show front side
    flipAnim.setValue(0); // Reset flip animation
    // We don't reset feedback state as we want to remember which cards received feedback
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderGrant: () => {
        console.log('Pan gesture started at index:', currentIndexRef.current);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const currentIdx = currentIndexRef.current;
        const currentCards = flashcardsRef.current;
        
        // Threshold to determine if swipe is significant enough
        const swipeThreshold = 100;
        
        if (Math.abs(gesture.dx) > swipeThreshold) {
          let updatedKnownCards = [...knownCardsRef.current];
          let updatedLearningCards = [...learningCardsRef.current];
          
          if (gesture.dx > 0) {
            // Right swipe - Mark as "Known/Mastered"
            console.log('Card marked as known:', currentIdx);
            
            // Update our tracking arrays first
            if (!updatedKnownCards.includes(currentIdx)) {
              updatedKnownCards.push(currentIdx);
            }
            updatedLearningCards = updatedLearningCards.filter(idx => idx !== currentIdx);
            
            // Now update the state
            setKnownCards(updatedKnownCards);
            setLearningCards(updatedLearningCards);
            
            // Animate card off screen to the right
            Animated.timing(pan, {
              toValue: cardWidth * 1.5,
              duration: 250,
              useNativeDriver: false,
            }).start(() => {
              // First reset the animation
              pan.setValue(0);
              
              // Check if we've reached the end
              if (currentIdx < currentCards.length - 1) {
                // Move to next card
                handleIndexChange(currentIdx + 1);
              } else {
                // We're at the last card - use the updated refs for accurate counts
                handleEndOfCards(updatedKnownCards, updatedLearningCards);
              }
            });
          } else {
            // Left swipe - Mark as "Still Learning"
            console.log('Card marked as still learning:', currentIdx);
            
            // Update our tracking arrays first
            if (!updatedLearningCards.includes(currentIdx)) {
              updatedLearningCards.push(currentIdx);
            }
            updatedKnownCards = updatedKnownCards.filter(idx => idx !== currentIdx);
            
            // Now update the state
            setLearningCards(updatedLearningCards);
            setKnownCards(updatedKnownCards);
            
            // Animate card off screen to the left
            Animated.timing(pan, {
              toValue: -cardWidth * 1.5,
              duration: 250,
              useNativeDriver: false,
            }).start(() => {
              // First reset the animation
              pan.setValue(0);
              
              // Check if we've reached the end
              if (currentIdx < currentCards.length - 1) {
                // Move to next card
                handleIndexChange(currentIdx + 1);
              } else {
                // We're at the last card - use the updated refs for accurate counts
                handleEndOfCards(updatedKnownCards, updatedLearningCards);
              }
            });
          }
        } else {
          // Not a significant swipe, bounce back to center
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Reset animation if gesture is terminated
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontZIndexInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [2, 2, -1, -1]  // Front has higher z-index when showing, lower when flipped
  });

  const backZIndexInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [-1, -1, 2, 2]  // Back has lower z-index when hidden, higher when showing
  });

  const frontAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      { rotateY: frontInterpolate }
    ]
  };
  
  const backAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      { rotateY: backInterpolate }
    ]
  };

  const cardAnimatedStyle = {
    transform: [
      { translateX: pan },
      { perspective: 1000 },
    ],
  };

  // Function to get font family based on selected font
  const getFontFamily = () => {
    switch (fontSettings.font) {
      case 'Reading':
        return 'Georgia';
      case 'Dyslexia-friendly':
        return 'OpenDyslexic';
      case 'High-visibility':
        return 'AtkinsonHyperlegible';
      case 'Monospaced':
        return 'IBMPlexMono';
      default: // Standard
        return theme.fonts.regular;
    }
  };

  const renderCard = (index: number, animatedStyle: any = {}) => {
    if (index >= flashcards.length) return null;
    
    const isKnown = knownCards.includes(index);
    const isLearning = learningCards.includes(index);
    
    // Update the custom text style with proper type assertions
    const customTextStyle = {
      ...styles.cardText,
      fontFamily: getFontFamily(),
      textTransform: fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const,
    };
    
    // Update border width interpolation to have 0 at rest position
    const borderWidthInterpolation = pan.interpolate({
      inputRange: [-100, -20, -10, 10, 20, 100],
      outputRange: [2, 2, 0, 0, 2, 2],
      extrapolate: 'clamp'
    });
    
    // Keep the border color interpolation
    const borderColorInterpolation = pan.interpolate({
      inputRange: [-100, -20, 20, 100],
      outputRange: ['#EE5775', '#EE5775', '#72CDA8', '#72CDA8'],
      extrapolate: 'clamp'
    });
    
    // Keep rotation and other interpolations
    const rotationInterpolation = pan.interpolate({
      inputRange: [-200, 0, 200],
      outputRange: ['-5deg', '0deg', '5deg'],
      extrapolate: 'clamp'
    });
    
    // Determine which text to show based on swipe direction
    const swipeTextOpacity = pan.interpolate({
      inputRange: [-100, -40, 40, 100],
      outputRange: [1, 0, 0, 1],
      extrapolate: 'clamp'
    });
    
    const originalTextOpacity = pan.interpolate({
      inputRange: [-100, -40, 40, 100],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp'
    });

    return (
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          {
            transform: [
              ...(animatedStyle.transform || []),
              { rotate: rotationInterpolation }
            ],
            borderWidth: borderWidthInterpolation,
            borderColor: borderColorInterpolation,
          }
        ]}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={flipCard}
          style={styles.touchableCard}
        >
          <Animated.View style={[
            styles.cardFace, 
            frontAnimatedStyle,
            { zIndex: frontZIndexInterpolate }
          ]}>
            {/* Apply custom font to card text */}
            <Animated.Text 
              style={[
                customTextStyle,
                { opacity: originalTextOpacity }
              ]}
            >
              {flashcards[index].front}
            </Animated.Text>
            
            {/* "Still learning" text - appears when swiping left */}
            <Animated.Text 
              style={[
                styles.cardText,
                styles.learningText, 
                { 
                  opacity: pan.interpolate({
                    inputRange: [-100, -40, 0],
                    outputRange: [1, 0, 0],
                    extrapolate: 'clamp'
                  }) 
                }
              ]}
            >
              {t('flashcards.stillLearning')}
            </Animated.Text>
            
            {/* "I know this" text - appears when swiping right */}
            <Animated.Text 
              style={[
                styles.cardText,
                styles.knownText, 
                { 
                  opacity: pan.interpolate({
                    inputRange: [0, 40, 100],
                    outputRange: [0, 0, 1],
                    extrapolate: 'clamp'
                  }) 
                }
              ]}
            >
              {t('flashcards.iKnowThis')}
            </Animated.Text>
            
            {/* Card footer with counter */}
            <View style={styles.cardFooter}>
              <View style={styles.cardCounter}>
                <Text style={styles.cardCounterText}>
                  {t('flashcards.counter', { current: currentIndex + 1, total: flashcards.length })}
                </Text>
              </View>
            </View>

            {/* Status indicator for cards already categorized */}
            {(isKnown || isLearning) && (
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: isKnown ? '#72CDA8' : '#EE5775' }
                ]} 
              />
            )}
          </Animated.View>
          
          {/* Back of card */}
          <Animated.View style={[
            styles.cardFace,
            styles.cardBack, 
            backAnimatedStyle,
            { zIndex: backZIndexInterpolate }
          ]}>
            {/* Apply custom font to back card text */}
            <Text style={customTextStyle}>{flashcards[index].back}</Text>
            
            <View style={styles.cardFooter}>
              <View style={styles.cardCounter}>
                <Text style={styles.cardCounterText}>
                  {t('flashcards.counter', { current: currentIndex + 1, total: flashcards.length })}
                </Text>
              </View>
            </View>

            {(isKnown || isLearning) && (
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: isKnown ? '#72CDA8' : '#EE5775' }
                ]} 
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Update the handleEndOfCards function to accept the updated arrays directly
  const handleEndOfCards = (finalKnownCards = knownCardsRef.current, finalLearningCards = learningCardsRef.current) => {
    console.log('End of flashcards reached');
    console.log('Final known cards indices:', finalKnownCards);
    console.log('Final learning cards indices:', finalLearningCards);
    
    let originalLearningIndices = [...finalLearningCards];
    
    // If we're using a filtered set, we need to map back to original indices
    if (filterIndices && filterIndices.length > 0) {
      console.log('Current filterIndices:', filterIndices);
      // Map from the positions in the filtered set to the original indices
      originalLearningIndices = finalLearningCards.map(filteredIdx => {
        const originalIdx = filterIndices[filteredIdx];
        console.log(`Mapping filtered index ${filteredIdx} to original index ${originalIdx}`);
        return originalIdx;
      });
      console.log('Mapped to original indices:', originalLearningIndices);
    }
    
    // Navigate to the results screen with the statistics
    navigation.navigate('FlashcardResults', { 
      knownCount: finalKnownCards.length, 
      learningCount: finalLearningCards.length,
      total: flashcards.length,
      studySetId: studySetId,
      learningIndices: originalLearningIndices
    });
  };

  // Also update the button handler functions to work similarly
  const markAsKnown = () => {
    const currentIdx = currentIndexRef.current;
    
    // Create updated arrays first
    let updatedKnownCards = [...knownCardsRef.current];
    let updatedLearningCards = [...learningCardsRef.current];
    
    if (!updatedKnownCards.includes(currentIdx)) {
      updatedKnownCards.push(currentIdx);
    }
    updatedLearningCards = updatedLearningCards.filter(idx => idx !== currentIdx);
    
    // Track flashcard interaction
    Analytics.logEvent(EventType.FLASHCARD_INTERACTION, {
      study_set_id: studySetId,
      card_index: currentIdx,
      interaction: 'marked_as_known',
      known_cards_count: updatedKnownCards.length,
      learning_cards_count: updatedLearningCards.length
    });
    
    // Update state
    setKnownCards(updatedKnownCards);
    setLearningCards(updatedLearningCards);
    
    // Move to next card or end
    if (currentIdx < flashcards.length - 1) {
      handleIndexChange(currentIdx + 1);
    } else {
      handleEndOfCards(updatedKnownCards, updatedLearningCards);
    }
  };

  const markAsLearning = () => {
    const currentIdx = currentIndexRef.current;
    
    // Create updated arrays first
    let updatedKnownCards = [...knownCardsRef.current];
    let updatedLearningCards = [...learningCardsRef.current];
    
    if (!updatedLearningCards.includes(currentIdx)) {
      updatedLearningCards.push(currentIdx);
    }
    updatedKnownCards = updatedKnownCards.filter(idx => idx !== currentIdx);
    
    // Track flashcard interaction
    Analytics.logEvent(EventType.FLASHCARD_INTERACTION, {
      study_set_id: studySetId,
      card_index: currentIdx,
      interaction: 'marked_as_learning',
      known_cards_count: updatedKnownCards.length,
      learning_cards_count: updatedLearningCards.length
    });
    
    // Update state
    setKnownCards(updatedKnownCards);
    setLearningCards(updatedLearningCards);
    
    // Move to next card or end
    if (currentIdx < flashcards.length - 1) {
      handleIndexChange(currentIdx + 1);
    } else {
      handleEndOfCards(updatedKnownCards, updatedLearningCards);
    }
  };

  const restartCards = () => {
    // Reset to the first card
    handleIndexChange(0);
  };

  // Add logging for screen view
  useEffect(() => {
    Analytics.logScreenView('Flashcards', {
      study_set_id: studySetId,
      filter_count: filterIndices.length
    });
    
    // Log feature use
    Analytics.logFeatureUse(FeatureType.FLASHCARDS, {
      study_set_id: studySetId,
      card_count: flashcards.length,
      filtered_cards: filterIndices.length > 0
    });
  }, [studySetId, filterIndices, flashcards.length]);

  // Add this with your other state variables
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  // Update the useEffect that tracks session time to also handle audio cleanup
  useEffect(() => {
    // Start timing when component mounts
    const startTime = Date.now();
    setSessionStartTime(startTime);
    
    // Log screen view
    Analytics.logScreenView('Flashcards', { study_set_id: studySetId });
    
    // Clean up when component unmounts
    return () => {
      // Calculate duration in seconds
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Only log if duration is reasonable (more than 3 seconds)
      if (durationSeconds > 3) {
        console.log('[Analytics] Logging flashcard session duration:', durationSeconds.toFixed(1) + 's');
        
        // Log as SESSION_END event with flashcards context
        Analytics.logEvent(EventType.SESSION_END, {
          duration_seconds: durationSeconds,
          context: 'flashcards',
          study_set_id: studySetId,
          cards_count: flashcards?.length || 0
        });
      }
    };
  }, [studySetId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('flashcards.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cardContainer}>
        {flashcards.length > 0 ? (
          <View {...panResponder.panHandlers} style={styles.cardStack}>
            {/* Background placeholder for next card - just a fixed background that doesn't animate */}
            <View style={styles.cardPlaceholder} />
            
            {/* Current card */}
            {renderCard(currentIndex, {
              transform: [
                { translateX: pan }
              ],
              zIndex: 1,
            })}
            
            {/* Next card - completely invisible during swipe, only appears after transition */}
            {currentIndex < flashcards.length - 1 && 
              <Animated.View 
                style={{
                  ...styles.card,
                  opacity: pan.interpolate({
                    inputRange: [-cardWidth, -cardWidth + 1, cardWidth - 1, cardWidth],
                    outputRange: [0, 0, 0, 0], // Completely invisible during swipe
                    extrapolate: 'clamp',
                  }),
                  zIndex: -2,
                }}
              >
                {/* Next card content will be shown after animation completes */}
              </Animated.View>
            }
          </View>
        ) : (
          <Text style={styles.noCardsText}>{t('flashcards.noCards')}</Text>
        )}
      </View>

      {/* Add feedback buttons below card but above control buttons */}
      {flashcards.length > 0 && (
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity 
              style={styles.feedbackButton} 
              onPress={() => handleFlashcardFeedback(true)}
              disabled={cardFeedbackSubmitted[currentIndex]}
            >
              <ThumbsUp 
                color={theme.colors.textSecondary}
                size={20} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.feedbackButton} 
              onPress={() => handleFlashcardFeedback(false)}
              disabled={cardFeedbackSubmitted[currentIndex]}
            >
              <ThumbsDown 
                color={theme.colors.textSecondary}
                size={20} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Updated control buttons */}
      <View style={styles.controlButtons}>
        {/* "Still learning" button with updated color */}
        <TouchableOpacity 
          style={styles.learningPill}
          onPress={markAsLearning}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#EE5775' }]}>
            <X color="#333333" size={12} />
          </View>
          <Text style={styles.indicatorCount}>
            {learningCards.length}
          </Text>
        </TouchableOpacity>
        
        {/* Refresh/restart button */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={restartCards}
        >
          <RotateCcw color={theme.colors.text} size={28} />
        </TouchableOpacity>
        
        {/* "Known" button with updated color */}
        <TouchableOpacity 
          style={styles.knownPill}
          onPress={markAsKnown}
        >
          <Text style={styles.indicatorCount}>
            {knownCards.length}
          </Text>
          <View style={[styles.iconCircle, { backgroundColor: '#72CDA8' }]}>
            <Check color="#333333" size={12} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Toast notification remains unchanged */}
      {showFeedbackToast && (
        <View style={styles.feedbackToast}>
          <View style={styles.closeToastButtonContainer}>
            <TouchableOpacity 
              style={styles.closeToastButton}
              onPress={() => setShowFeedbackToast(false)}
            >
              <X color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
          <Text style={styles.feedbackToastText}>
            {t('feedback.thankYou')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const additionalStyles = StyleSheet.create({
  noCardsText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    textAlign: 'center' as const,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  card: {
    width: cardWidth,
    height: cardWidth * 1.4, // Make cards taller to match design
    position: 'absolute',
    borderRadius: 24,
  },
  touchableCard: {
    width: '100%',
    height: '100%',
  },
  cardBack: {
    backgroundColor: theme.colors.background02,
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden' as const,
    top: 0,
    left: 0,
    shadowColor: '#0D0B0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  cardText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.xl,
    textAlign: 'center' as const,
    fontFamily: theme.fonts.regular,
  },
  cardFooter: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  cardCounter: {
    position: 'relative',
  },
  cardCounterText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    lineHeight: 20,
  },
  soundButton: {
    position: 'relative',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
  },
  learningPill: {
    height: 48,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 12,
    backgroundColor: theme.colors.background02,
  },
  knownPill: {
    height: 44,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 0,
    paddingLeft: 12,
    backgroundColor: theme.colors.background02,
  },
  iconCircle: {
    width: 16,
    height: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  centerButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.background02,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorCount: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSizes.md,
    marginHorizontal: 8,
  },
  cardStack: {
    width: cardWidth,
    height: cardWidth * 1.4,
    position: 'relative',
  },
  cardFace: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background02,
    borderRadius: 24,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    shadowColor: '#0D0B0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  statusIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  learningText: {
    color: '#EE5775',
    position: 'absolute',
    fontWeight: '600',
  },
  knownText: {
    color: '#72CDA8',
    position: 'absolute',
    fontWeight: '600',
  },
  cardPlaceholder: {
    width: cardWidth,
    height: cardWidth * 1.4,
    backgroundColor: theme.colors.background02,
    borderRadius: 24,
    position: 'absolute',
    zIndex: -3, // Behind everything else
  },
  ...additionalStyles,
  feedbackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16, // Add top margin to move buttons lower
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  feedbackButton: {
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 0,
  },
  feedbackToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 60, 0.5)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackToastText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    flex: 1,
    textAlign: 'left',
    paddingLeft: 0,
    marginRight: 0,
  },
  closeToastButtonContainer: {
    marginRight: 4,
    marginLeft: -4,
  },
  closeToastButton: {
    padding: 5,
    backgroundColor: 'rgba(80, 80, 80, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
});