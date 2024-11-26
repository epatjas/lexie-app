import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySet } from '../hooks/useStudySet'; 

type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;

export default function StudySetScreen({ route, navigation }: StudySetScreenProps) {
  const { id } = route.params;
  const studySet = useStudySet(id); // Custom hook to fetch study set data

  if (!studySet) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{studySet.title}</Text>
          <Text style={styles.date}>
            {new Date(studySet.createdAt).toLocaleDateString('fi-FI', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => navigation.navigate('Flashcards', { studySetId: id })}
        >
          <View style={styles.optionIcon}>
            {/* Add your flashcard icon here */}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Memorize key concepts</Text>
            <Text style={styles.optionSubtitle}>Flipcards</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => navigation.navigate('Quiz', { studySetId: id })}
        >
          <View style={styles.optionIcon}>
            {/* Add your quiz icon here */}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Test your skills</Text>
            <Text style={styles.optionSubtitle}>Quiz</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.contentSection}>
          <Text style={styles.contentText}>{studySet.text}</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSizes.xl,
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
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20',
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  optionSubtitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  contentSection: {
    padding: theme.spacing.lg,
  },
  contentText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    lineHeight: 24,
  },
});
