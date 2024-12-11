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

type QuizCompleteScreenProps = NativeStackScreenProps<RootStackParamList, 'QuizComplete'>;

export default function QuizCompleteScreen({ route, navigation }: QuizCompleteScreenProps) {
  const { correctAnswers, totalQuestions, timeSpent, studySetId } = route.params;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const getCompletionMessage = (score: number): { title: string; subtitle: string } => {
    if (score === 100) {
      return {
        title: 'Huippusuoritus!',
        subtitle: 'Olet mestari!'
      };
    } else if (score >= 80) {
      return {
        title: 'Upeaa!',
        subtitle: 'Melkein täydellistä!'
      };
    } else if (score >= 60) {
      return {
        title: 'Hieno suoritus!',
        subtitle: 'Jatka samaan tapaan'
      };
    } else if (score >= 40) {
      return {
        title: 'Hyvä alku!',
        subtitle: 'Jatka harjoittelua!'
      };
    } else {
      return {
        title: 'Ei haittaa!',
        subtitle: 'Kokeile uudestaan?'
      };
    }
  };

  const message = getCompletionMessage(percentage);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.subtitle}>{message.subtitle}</Text>

        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { borderColor: theme.colors.yellowDark }]}>
            <Text style={[styles.statLabel, { color: theme.colors.yellowDark }]}>
              OIKEIN
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
             AIKA
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
        <Text style={styles.buttonText}>Jatka</Text>
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
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    opacity: 0.7,
    marginBottom: theme.spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statBox: {
    backgroundColor: theme.colors.background02,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    width: 140,
    height: 140,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
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
    backgroundColor: theme.colors.primary,
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