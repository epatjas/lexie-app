import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { QuizQuestion } from '../types/types';
import { getQuizFromStudySet } from '../services/Database';
import Svg, { Circle } from 'react-native-svg';

type QuizScreenProps = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

const fetchQuizQuestions = async (studySetId: string): Promise<QuizQuestion[]> => {
  try {
    const quiz = await getQuizFromStudySet(studySetId);
    return quiz || [];
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return [];
  }
};

const ProgressCircle = ({ current, total }: { current: number; total: number }) => {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (current / total) * 100;
  
  return (
    <View style={styles.progressCircle}>
      <Svg width={size} height={size} style={styles.progressSvg}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.stroke}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * ((100 - progress) / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.progressText}>{current}/{total}</Text>
    </View>
  );
};

export default function QuizScreen({ route, navigation }: QuizScreenProps) {
  const { quiz, studySetId } = route.params;
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState<Date>(new Date());
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    if (!quiz && studySetId) {
      fetchQuizQuestions(studySetId).then(setQuestions);
    }
  }, [studySetId, quiz]);

  useEffect(() => {
    if (questions.length > 0) {
      console.log('Loaded Questions:', questions);
      console.log('First Question:', questions[0]);
    }
  }, [questions]);

  useEffect(() => {
    if (currentQuestion) {
      console.log('Current Question Updated:', currentQuestion);
      console.log('Correct Answer:', currentQuestion.correct);
    }
  }, [currentQuestion]);

  useEffect(() => {
    setStartTime(new Date());
  }, []);

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading questions...</Text>
      </SafeAreaView>
    );
  }

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setValidationMessage(null);
  };

  const handleCheck = () => {
    if (!selectedAnswer) {
      setValidationMessage('Valitse vastaus ennen tarkistusta');
      return;
    }
    setValidationMessage(null);
    setIsAnswerChecked(true);
    
    const selectedLetter = selectedAnswer.split(')')[0].trim();
    
    if (selectedLetter === currentQuestion.correct) {
      setCorrectAnswers(prev => prev + 1);
    } else {
      setWrongAnswers(prev => prev + 1);
      setAttempts(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const endTime = new Date();
      const timeSpentMs = endTime.getTime() - startTime.getTime();
      
      const minutes = Math.floor(timeSpentMs / 60000);
      const seconds = Math.floor((timeSpentMs % 60000) / 1000);
      
      const timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      navigation.navigate('QuizComplete', {
        correctAnswers,
        totalQuestions: questions.length,
        timeSpent,
        studySetId
      });
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
      setAttempts(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Testaa taitosi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.scoreWrapper}>
          <View style={styles.scoreItem}>
            <View style={[styles.scoreIndicator, { backgroundColor: theme.colors.correct }]}>
              <Check size={16} color={theme.colors.text} strokeWidth={3} />
            </View>
            <Text style={styles.scoreNumber}>{correctAnswers}</Text>
          </View>
          <View style={styles.scoreItem}>
            <View style={[styles.scoreIndicator, { backgroundColor: theme.colors.incorrect }]}>
              <X size={16} color={theme.colors.text} strokeWidth={3} />
            </View>
            <Text style={styles.scoreNumber}>{wrongAnswers}</Text>
          </View>
        </View>
        <ProgressCircle 
          current={currentQuestionIndex + 1} 
          total={questions.length} 
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>{currentQuestion.question}</Text>

        <View style={styles.options}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && styles.selectedOption,
                isAnswerChecked && 
                  selectedAnswer === option && 
                  selectedAnswer.split(')')[0].trim() === currentQuestion.correct && 
                  styles.correctOption,
                isAnswerChecked && 
                  selectedAnswer === option && 
                  selectedAnswer.split(')')[0].trim() !== currentQuestion.correct && 
                  styles.wrongOption,
              ]}
              onPress={() => handleAnswerSelect(option)}
              disabled={isAnswerChecked && 
                selectedAnswer?.split(')')[0].trim() === currentQuestion.correct}
            >
              <Text style={styles.optionText}>{option}</Text>
              {isAnswerChecked && selectedAnswer === option && (
                <View style={[
                  styles.indicator, 
                  { backgroundColor: selectedAnswer.split(')')[0].trim() === currentQuestion.correct
                    ? theme.colors.correct + '20'
                    : theme.colors.incorrect + '20'
                  }
                ]}>
                  {selectedAnswer.split(')')[0].trim() === currentQuestion.correct ? (
                    <Check size={16} color={theme.colors.correct} />
                  ) : (
                    <X size={16} color={theme.colors.incorrect} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomBar}>
        {validationMessage ? (
          <Text style={styles.validationText}>{validationMessage}</Text>
        ) : isAnswerChecked ? (
          <Text style={[
            styles.feedbackText,
            { 
              color: selectedAnswer?.split(')')[0].trim() === currentQuestion.correct
                ? theme.colors.correct 
                : theme.colors.incorrect 
            }
          ]}>
            {selectedAnswer?.split(')')[0].trim() === currentQuestion.correct
              ? 'Hienoa, oikein meni!'
              : attempts >= 2
                ? `Se meni väärin. Oikea vastaus on ${currentQuestion.correct}.`
                : 'Se meni väärin. Kokeile uudestaan.'}
          </Text>
        ) : null}
        
        {isAnswerChecked ? (
          <>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: selectedAnswer?.split(')')[0].trim() === currentQuestion.correct
                    ? theme.colors.correct
                    : theme.colors.incorrect
                }
              ]}
              onPress={
                selectedAnswer?.split(')')[0].trim() === currentQuestion.correct || attempts >= 2
                  ? handleNext
                  : () => {
                      setIsAnswerChecked(false);
                      setSelectedAnswer(null);
                      setValidationMessage(null);
                    }
              }
            >
              <Text style={[
                styles.actionButtonText, 
                { color: theme.colors.background }
              ]}>
                {selectedAnswer?.split(')')[0].trim() === currentQuestion.correct || attempts >= 2
                  ? 'Jatka'
                  : 'Selvä'}
              </Text>
            </TouchableOpacity>
            {selectedAnswer?.split(')')[0].trim() !== currentQuestion.correct && 
             attempts < 2 && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleNext}
              >
                <Text style={styles.skipButtonText}>Hyppää seuraavaan</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCheck}
          >
            <Text style={[
              styles.actionButtonText,
              { color: theme.colors.text }  // Use text color for primary button
            ]}>
              Check
            </Text>
          </TouchableOpacity>
        )}
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
      padding: theme.spacing.md,
      justifyContent: 'space-between',
    },
    headerTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.lg,
      fontFamily: theme.fonts.medium,
    },
    scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    scoreWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.stroke,
      borderRadius: 24,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: theme.spacing.sm,
    },
    scoreItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scoreIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreNumber: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
      fontFamily: theme.fonts.medium,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    question: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.xl,
      marginBottom: theme.spacing.xl,
    },
    options: {
      gap: theme.spacing.sm,
    },
    optionButton: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background02,
      borderWidth: 1,
      borderColor: theme.colors.stroke,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectedOption: {
      borderColor: theme.colors.primary,
      borderWidth: 1,
    },
    correctOption: {
      borderColor: theme.colors.correct,
      borderWidth: 2,
    },
    wrongOption: {
      borderColor: theme.colors.incorrect,
      borderWidth: 1,
    },
    optionText: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
    },
    wrongIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.incorrect + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomBar: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    actionButton: {
      backgroundColor: theme.colors.primary,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: theme.fontSizes.md,
      fontFamily: theme.fonts.medium,
    },
    feedbackText: {
      color: theme.colors.incorrect,
      fontSize: theme.fontSizes.md,
      textAlign: 'center',
      fontFamily: theme.fonts.medium,
    },
    loadingText: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    progressCircle: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressSvg: {
      position: 'absolute',
    },
    progressText: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.sm,
      fontFamily: theme.fonts.medium,
      textAlign: 'center',
    },
    skipButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xs,
    },
    skipButtonText: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
      fontFamily: theme.fonts.regular,
    },
    validationText: {
      color: theme.colors.incorrect,
      fontSize: theme.fontSizes.md,
      textAlign: 'center',
      fontFamily: theme.fonts.medium,
      marginBottom: theme.spacing.sm,
    },
    indicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });