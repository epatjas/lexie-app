import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ChevronLeft, StepForward, Volume2 as VolumeIcon, Brain } from 'lucide-react-native';
import theme from '../styles/theme';

type ConceptCardScreenProps = NativeStackScreenProps<RootStackParamList, 'ConceptCardScreen'>;

type ConceptCard = {
  card_number: number;
  title: string;
  explanation: string;
  hint: string;
};

export default function ConceptCardScreen({ route, navigation }: ConceptCardScreenProps) {
  console.log('[ConceptCardScreen] Component rendering');
  
  const { cards, title } = route.params;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
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
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header - centered title with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Learn</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{currentCard.title}</Text>
          <Text style={styles.cardSubtitle}>{currentCard.explanation}</Text>
          
          {/* Main content area */}
          <View style={styles.cardContent}>
            {/* Content goes here if needed */}
          </View>
          
          {/* Hint Section */}
          <View style={styles.hintContainer}>
            <View style={styles.hintHeader}>
              <Text style={styles.hintLabel}>Hint</Text>
              <Brain color={theme.colors.textSecondary} size={16} />
            </View>
            <Text style={styles.hintText}>{currentCard.hint}</Text>
          </View>
          
          {/* Card Navigation */}
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
      
      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={goToNextCard} style={styles.nextButton}>
          <StepForward color="#FFFFFF" size={20} />
        </TouchableOpacity>
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
    alignItems: 'center',
    paddingBottom: 16,
  },
  nextButton: {
    width: 96,
    height: 96,
    borderRadius: 64,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
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