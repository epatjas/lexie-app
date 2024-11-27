import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySet } from '../hooks/useStudySet';
import { ArrowLeft, FlipHorizontal, Zap, Play } from 'lucide-react-native';

type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;

export default function StudySetScreen({ route, navigation }: StudySetScreenProps) {
  if (!route.params?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Invalid study set ID</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { id } = route.params;
  const studySet = useStudySet(id);

  if (!studySet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Loading...</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading study set...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(studySet.created_at).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleCreateQuiz = async () => {
    try {
      navigation.navigate('Quiz', { studySetId: id });
    } catch (error) {
      console.error('Error navigating to quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
    }
  };

  const handleFlashcardsPress = async () => {
    try {
      navigation.navigate('Flashcards', { studySetId: id });
    } catch (error) {
      console.error('Error navigating to flashcards:', error);
      Alert.alert('Error', 'Failed to load flashcards');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{studySet.title}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleFlashcardsPress}
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.colors.lavender + '20' }]}>
            <FlipHorizontal color={theme.colors.background} size={24} />
          </View>
          <Text style={styles.optionTitle}>Harjoittele avainkäsitteitä</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleCreateQuiz}
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.colors.mint + '20' }]}>
            <Zap color={theme.colors.background} size={24} />
          </View>
          <Text style={styles.optionTitle}>Testaa taitosi</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.contentSection}>
          <Text style={styles.contentTitle}>
            {studySet.title}
          </Text>
          <TouchableOpacity style={styles.listenButton}>
            <View style={styles.listenIcon}>
              <Play color={theme.colors.text} size={20} />
            </View>
            <Text style={styles.listenButtonText}>Kuuntele</Text>
          </TouchableOpacity>
          <Text style={styles.contentText}>
            {studySet.text_content || 'No content available'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  date: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  optionButton: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  contentSection: {
    padding: theme.spacing.lg,
  },
  contentTitle: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: theme.borderRadius.xxl,
    alignSelf: 'flex-start',
  },
  listenButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  listenIcon: {
    marginRight: theme.spacing.xs,
  },
  contentText: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    lineHeight: 28,
    padding: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerTitleText: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
});
