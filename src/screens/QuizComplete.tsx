import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import theme from '../styles/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { CheckCircle, Timer } from 'lucide-react-native';
import ParticleBackground from '../components/ParticleBackground';
import { useTranslation } from '../i18n/LanguageContext';

type QuizCompleteScreenProps = NativeStackScreenProps<RootStackParamList, 'QuizComplete'>;

export default function QuizCompleteScreen({ route, navigation }: QuizCompleteScreenProps) {
  const { t } = useTranslation();
  const { correctAnswers, totalQuestions, timeSpent, studySetId } = route.params;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const getCompletionMessage = (score: number): { title: string; subtitle: string } => {
    if (score === 100) {
      return {
        title: t('quizComplete.results.perfect.title'),
        subtitle: t('quizComplete.results.perfect.subtitle')
      };
    } else if (score >= 80) {
      return {
        title: t('quizComplete.results.excellent.title'),
        subtitle: t('quizComplete.results.excellent.subtitle')
      };
    } else if (score >= 60) {
      return {
        title: t('quizComplete.results.good.title'),
        subtitle: t('quizComplete.results.good.subtitle')
      };
    } else if (score >= 40) {
      return {
        title: t('quizComplete.results.average.title'),
        subtitle: t('quizComplete.results.average.subtitle')
      };
    } else {
      return {
        title: t('quizComplete.results.needsImprovement.title'),
        subtitle: t('quizComplete.results.needsImprovement.subtitle')
      };
    }
  };

  const message = getCompletionMessage(percentage);

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      
      <View style={styles.content}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.subtitle}>{message.subtitle}</Text>

        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { borderColor: theme.colors.yellowDark }]}>
            <Text style={[styles.statLabel, { color: theme.colors.yellowDark }]}>
              {t('quizComplete.stats.correct')}
            </Text>
            <CheckCircle 
              size={24} 
              color={theme.colors.yellowDark}
              style={styles.statIcon}
            />
            <Text style={[styles.statValue, { color: theme.colors.yellowDark }]}>
              {percentage}%
            </Text>
          </View>

          <View style={[styles.statBox, { borderColor: theme.colors.blue }]}>
            <Text style={[styles.statLabel, { color: theme.colors.blue }]}>
              {t('quizComplete.stats.time')}
            </Text>
            <Timer 
              size={24} 
              color={theme.colors.blue}
              style={styles.statIcon}
            />
            <Text style={[styles.statValue, { color: theme.colors.blue }]}>
              {timeSpent}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('StudySet', { id: studySetId })}
      >
        <Text style={styles.buttonText}>{t('quizComplete.backToLesson')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emoji: {
    fontSize: 32,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.xxl,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    opacity: 0.7,
    marginBottom: theme.spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    width: 140,
    height: 140,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    letterSpacing: 0.1,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  statIcon: {
    marginBottom: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
  },
  button: {
    backgroundColor: theme.colors.text,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
  },
});