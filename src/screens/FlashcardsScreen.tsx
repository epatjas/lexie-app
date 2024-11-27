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
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { getFlashcardsFromStudySet } from '../services/Database';
import { Flashcard } from '../types/types';

type FlashcardsScreenProps = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

const { width } = Dimensions.get('window');
const cardWidth = width - 48; // 24px padding on each side

export default function FlashcardsScreen({ route, navigation }: FlashcardsScreenProps) {
  const { studySetId } = route.params;
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnim] = useState(new Animated.Value(0));
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const pan = useRef(new Animated.Value(0)).current;
  const flashcardsRef = useRef<Flashcard[]>([]);

  useEffect(() => {
    loadFlashcards();
  }, [studySetId]);

  const loadFlashcards = async () => {
    try {
      console.log('Loading flashcards for study set:', studySetId);
      const cards = await getFlashcardsFromStudySet(studySetId);
      console.log('Retrieved flashcards:', cards);
      
      if (!cards || cards.length === 0) {
        console.log('No flashcards found');
        return;
      }
      
      if (cards.length > 0) {
        console.log('First card structure:', JSON.stringify(cards[0], null, 2));
      }
      
      setFlashcards(cards);
      flashcardsRef.current = cards;
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

  // Add this helper function to handle index changes
  const handleIndexChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    setIsFlipped(false);  // Always show front side
    flipAnim.setValue(0); // Reset flip animation
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
        const currentCards = flashcardsRef.current;
        const index = currentIndexRef.current;
        console.log('Released at index:', index);
        console.log('Total cards:', currentCards.length);
        
        if (Math.abs(gesture.dx) > 100) {
          if (gesture.dx < 0 && index < currentCards.length - 1) {
            // Swipe left - next card
            console.log('Swiping to next card');
            Animated.timing(pan, {
              toValue: -cardWidth,
              duration: 200,
              useNativeDriver: false,
            }).start(() => {
              handleIndexChange(index + 1);  // Use the new helper
              pan.setValue(0);
            });
          } else if (gesture.dx > 0 && index > 0) {
            // Swipe right - previous card
            console.log('Swiping to previous card');
            Animated.timing(pan, {
              toValue: cardWidth,
              duration: 200,
              useNativeDriver: false,
            }).start(() => {
              handleIndexChange(index - 1);  // Use the new helper
              pan.setValue(0);
            });
          } else {
            console.log('Cannot move further because:', {
              direction: gesture.dx < 0 ? 'left' : 'right',
              currentIndex: index,
              totalCards: currentCards.length,
              canMoveNext: index < currentCards.length - 1,
              canMovePrevious: index > 0
            });
            // Bounce back if at the end or beginning
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          }
        } else {
          console.log('Swipe not far enough:', gesture.dx);
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

  const renderCard = (index: number, animatedStyle: any = {}) => {
    if (index >= flashcards.length) return null;
    
    return (
      <Animated.View
        style={[
          styles.card,
          animatedStyle
        ]}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={flipCard}
          style={styles.touchableCard}
        >
          <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
            <Text style={styles.cardText}>{flashcards[index].front}</Text>
          </Animated.View>
          
          <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
            <Text style={styles.cardText}>{flashcards[index].back}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kääntökortit</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cardContainer}>
        {flashcards.length > 0 ? (
          <View {...panResponder.panHandlers} style={styles.cardStack}>
            {/* Previous card */}
            {currentIndex > 0 && renderCard(currentIndex - 1, {
              transform: [
                { translateX: pan.interpolate({
                  inputRange: [0, cardWidth],
                  outputRange: [-cardWidth - 20, 0],
                  extrapolate: 'clamp',
                })}
              ],
              opacity: pan.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              zIndex: -1,
            })}

            {/* Current card */}
            {renderCard(currentIndex, {
              transform: [
                { translateX: pan }
              ],
              zIndex: 1,
            })}
            
            {/* Next card */}
            {currentIndex < flashcards.length - 1 && renderCard(currentIndex + 1, {
              transform: [
                { translateX: pan.interpolate({
                  inputRange: [-cardWidth, 0],
                  outputRange: [0, cardWidth + 20],
                  extrapolate: 'clamp',
                })}
              ],
              opacity: pan.interpolate({
                inputRange: [-50, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
              zIndex: -1,
            })}
          </View>
        ) : (
          <Text style={styles.noCardsText}>No flashcards available</Text>
        )}
      </View>

      <View style={styles.progressDots}>
        {flashcards.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot,
              i === currentIndex ? styles.activeDot : null
            ]} 
          />
        ))}
      </View>
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
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  card: {
    width: cardWidth,
    height: cardWidth * 0.7,
    position: 'absolute',
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
  progressDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    paddingBottom: theme.spacing.xl,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.stroke,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  ...additionalStyles,
  cardStack: {
    width: cardWidth,
    height: cardWidth * 0.7,
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
    borderWidth: 1,
    borderColor: theme.colors.stroke,
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
});