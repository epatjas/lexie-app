import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Check, X, PieChart, ChevronLeft } from 'lucide-react-native';
import theme from '../styles/theme';
import Svg, { Path, Circle } from 'react-native-svg';

type FlashcardResultsScreenProps = NativeStackScreenProps<RootStackParamList, 'FlashcardResults'>;

const { width } = Dimensions.get('window');
const cardWidth = width - 48;
const CHART_SIZE = cardWidth * 0.7; // Size of our chart

export default function FlashcardResultsScreen({ route, navigation }: FlashcardResultsScreenProps) {
  const { knownCount = 0, learningCount = 0, total = 0, studySetId, learningIndices = [] } = route.params;
  
  // Fix the percentage calculation and add more debugging
  const actualTotal = total || (knownCount + learningCount);
  const progressPercentage = actualTotal > 0 ? Math.round((knownCount / actualTotal) * 100) : 0;
  
  // Debug the calculations
  useEffect(() => {
    console.log("FlashcardResults calculation:", {
      knownCount,
      learningCount,
      total,
      actualTotal,
      progressPercentage
    });
  }, [knownCount, learningCount, total, actualTotal, progressPercentage]);
  
  console.log("FlashcardResults stats:", {
    knownCount,
    learningCount,
    total,
    progressPercentage
  });
  
  const handlePracticeWithQuestions = () => {
    // Navigate to the quiz mode or questions screen
    navigation.navigate('Quiz', { studySetId });
  };
  
  const handleKeepReviewing = () => {
    // If there are no cards to review (all mastered), restart the whole set
    if (!learningIndices || learningIndices.length === 0) {
      console.log('All cards mastered - restarting full flashcard set');
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Flashcards', params: { studySetId } } // No filterIndices - show all cards
        ],
      });
    } else {
      // Otherwise, review only the cards still being learned
      console.log('Returning to review cards with indices:', learningIndices);
      const numericIndices = learningIndices.map(idx => Number(idx));
      console.log('Passing to Flashcards:', {
        studySetId,
        filterIndices: numericIndices
      });
      
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Flashcards', params: { studySetId, filterIndices: numericIndices } }
        ],
      });
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('StudySet', { id: studySetId })} 
          style={styles.backButton}
        >
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Brilliant work.</Text>
        
        <View style={styles.statsCard}>
          <View style={styles.progressHeader}>
            <PieChart color="#F5D76E" size={16} style={styles.progressIcon} />
            <Text style={styles.progressText}>Your progress</Text>
          </View>
          
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageNumber}>{progressPercentage}%</Text>
            <Text style={styles.percentageLabel}>
              Terms{'\n'}Mastered
            </Text>
          </View>
          
          {/* New semicircular progress chart */}
          <View style={styles.chartContainer}>
            <Svg 
              width={CHART_SIZE} 
              height={CHART_SIZE/2 + 20} 
              viewBox={`0 0 100 60`}  // Standard viewBox for easier calculation
            >
              {/* Red background arc (full semicircle) */}
              <Path
                d="M 5,50 A 45,45 0 0 1 95,50" 
                stroke="#EE5775"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
              />
              
              {/* Green progress arc - adjust using strokeDasharray and strokeDashoffset */}
              <Path
                d="M 5,50 A 45,45 0 0 1 95,50" 
                stroke="#72CDA8"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${progressPercentage * 1.42}, 1000`} // 142 is approx the length of the arc path
              />
            </Svg>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.knownIconCircle}>
                <Check color="#333333" size={14} />
              </View>
              <Text style={styles.statLabel}>Mastered</Text>
              <Text style={styles.statValue}>{knownCount}</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.learningIconCircle}>
                <X color="#333333" size={14} />
              </View>
              <Text style={styles.statLabel}>Still learning</Text>
              <Text style={styles.statValue}>{learningCount}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handlePracticeWithQuestions}
          >
            <Text style={styles.primaryButtonText}>Practise with questions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleKeepReviewing}
          >
            <Text style={styles.secondaryButtonText}>
              {learningCount > 0 
                ? `Keep reviewing ${learningCount} terms` 
                : 'Restart flashcards'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    paddingTop: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: theme.colors.text,
    marginTop: 0,
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: theme.colors.background02,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    minHeight: 440,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressIcon: {
    marginRight: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  percentageNumber: {
    fontSize: 40,
    fontWeight: '500',
    color: theme.colors.text,
  },
  percentageLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 5,
  },
  // New chart styles
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginVertical: 20,
    // Add a subtle border to help with debugging if needed
    // borderWidth: 1,
    // borderColor: 'gray',
  },
  
  arcContainer: {
    width: CHART_SIZE,
    height: 20, // thickness of the arc
    borderRadius: 4, // half the thickness for rounded ends
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    // Shape into a semicircle
    borderTopLeftRadius: CHART_SIZE / 2,
    borderTopRightRadius: CHART_SIZE / 2,
    transformOrigin: 'center bottom',
    transform: [{ scaleY: 8 }], // Stretch vertically to create semicircle effect
  },
  
  redArc: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#EE5775',
  },
  
  greenArc: {
    position: 'absolute',
    height: '100%',
    left: 0,
    backgroundColor: '#72CDA8',
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  knownIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#72CDA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  learningIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#EE5775',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginRight: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: theme.colors.background02,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '400',
  },
});

function calculateXPosition(percentage: number): number {
  // Handle edge cases
  if (percentage <= 0) return 10;
  if (percentage >= 100) return CHART_SIZE - 10;
  
  // For a semicircle, X varies from left to right as percentage increases
  // 0% = leftmost point, 100% = rightmost point
  if (percentage <= 50) {
    // For 0-50%, X is in the left half
    return CHART_SIZE / 2 - Math.cos(Math.PI * percentage / 50) * (CHART_SIZE/2 - 10);
  } else {
    // For 51-100%, X is in the right half
    return CHART_SIZE / 2 + Math.cos(Math.PI * (100 - percentage) / 50) * (CHART_SIZE/2 - 10);
  }
}

function calculateYPosition(percentage: number): number {
  // Handle edge cases
  if (percentage <= 0 || percentage >= 100) return CHART_SIZE/2;
  
  // Y position decreases as we move up the arc
  // At 50%, we reach the topmost point
  if (percentage <= 50) {
    // For 0-50%, Y decreases as we go up
    return CHART_SIZE/2 - Math.sin(Math.PI * percentage / 50) * (CHART_SIZE/2 - 10);
  } else {
    // For 51-100%, Y increases as we come down
    return CHART_SIZE/2 - Math.sin(Math.PI * (100 - percentage) / 50) * (CHART_SIZE/2 - 10);
  }
} 