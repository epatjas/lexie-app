import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { QuizQuestion } from '../types/types';
import { getQuizFromStudySet } from '../services/Database';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';

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

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

// Add this constant
const FONT_SETTINGS_KEY = 'global_font_settings';

export default function QuizScreen({ route, navigation }: QuizScreenProps) {
  const { studySetId } = route.params;
  const quizFromParams = route.params.quiz;
  
  const hasInitialQuiz = Array.isArray(quizFromParams) && quizFromParams.length > 0;
  
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    hasInitialQuiz ? quizFromParams : []
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswerText, setSelectedAnswerText] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  
  // Keep font settings state
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    console.log('Quiz loading condition check:', {
      hasInitialQuiz,
      studySetId,
      quizParamsLength: Array.isArray(quizFromParams) ? quizFromParams.length : 'not array'
    });
    
    if (!hasInitialQuiz && studySetId) {
      console.log('Fetching quiz questions for study set:', studySetId);
      fetchQuizQuestions(studySetId)
        .then(fetchedQuestions => {
          if (fetchedQuestions && fetchedQuestions.length > 0) {
            console.log('Successfully loaded questions:', fetchedQuestions);
            setQuestions(fetchedQuestions);
          } else {
            console.warn('No quiz questions found');
            Alert.alert(
              'Error',
              'No quiz questions found for this study set.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        })
        .catch(error => {
          console.error('Error loading quiz questions:', error);
          Alert.alert(
            'Error',
            'Failed to load quiz questions.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        });
    }
  }, [studySetId, hasInitialQuiz]);

  useEffect(() => {
    if (questions.length > 0) {
      console.log('Loaded Questions:', questions);
      console.log('First Question:', questions[0]);
    }
  }, [questions]);

  useEffect(() => {
    if (currentQuestion) {
      console.log('Current question data:', {
        question: currentQuestion.question,
        options: currentQuestion.options,
        correct: currentQuestion.correct
      });
    }
  }, [currentQuestion]);

  useEffect(() => {
    setStartTime(new Date());
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      setShuffledOptions(shuffleArray(currentQuestion.options));
    }
  }, [currentQuestion]);

  // Load global font settings
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(FONT_SETTINGS_KEY);
        if (storedSettings) {
          setFontSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('[Quiz] Error loading font settings:', error);
      }
    };
    
    loadFontSettings();
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
    setSelectedAnswerText(answer);
    setValidationMessage(null);
  };

  const handleCheck = () => {
    if (!selectedAnswer) {
      setValidationMessage('Valitse vastaus ennen tarkistusta');
      return;
    }
    
    console.log('Selected Answer:', selectedAnswer);
    console.log('Correct Answer:', currentQuestion.correct);
    console.log('Are they equal?:', selectedAnswer === currentQuestion.correct);
    
    setValidationMessage(null);
    setIsAnswerChecked(true);
    
    if (selectedAnswer === currentQuestion.correct) {
      setCorrectAnswers(prev => prev + 1);
      setAttempts(0);
    } else {
      if (attempts >= 1) {
        setWrongAnswers(prev => prev + 1);
      }
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

      const finalCorrectAnswers = correctAnswers + (attempts === 1 ? 1 : 0);

      navigation.navigate('QuizComplete', {
        correctAnswers: finalCorrectAnswers,
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

  const getCustomFontStyle = () => ({
    fontFamily: getFontFamily(),
    textTransform: fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const,
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Practise</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreWrapper}>
            <View style={styles.scoreItem}>
              <View style={[styles.scoreIndicator, { backgroundColor: theme.colors.correct }]}>
                <Check size={12} color={theme.colors.background} strokeWidth={3} />
              </View>
              <Text style={styles.scoreNumber}>{correctAnswers}</Text>
            </View>
            <View style={styles.scoreItem}>
              <View style={[styles.scoreIndicator, { backgroundColor: theme.colors.incorrect }]}>
                <X size={12} color={theme.colors.background} strokeWidth={3} />
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
          <Text style={[
            styles.question,
            getCustomFontStyle()
          ]}>
            {currentQuestion.question}
          </Text>

          <View style={styles.options}>
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correct;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.selectedOption,
                    isAnswerChecked && isSelected && isCorrect && styles.correctOption,
                    isAnswerChecked && isSelected && !isCorrect && styles.wrongOption,
                  ]}
                  onPress={() => handleAnswerSelect(option)}
                  disabled={isAnswerChecked}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionText,
                      getCustomFontStyle(),
                      isSelected && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                    <View style={[
                      styles.indicator,
                      !isAnswerChecked && styles.hiddenIndicator,
                      { backgroundColor: isAnswerChecked && isSelected 
                        ? (isCorrect 
                          ? theme.colors.correct + '20'
                          : theme.colors.incorrect + '20')
                        : 'transparent'
                      }
                    ]}>
                      {isAnswerChecked && isSelected && (
                        isCorrect ? (
                          <Check size={16} color={theme.colors.correct} />
                        ) : (
                          <X size={16} color={theme.colors.incorrect} />
                        )
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>

      <View style={[
        styles.bottomBar,
        isAnswerChecked && { 
          backgroundColor: theme.colors.background02, 
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32 
        }
      ]}>
        {validationMessage ? (
          <Text style={styles.validationText}>{validationMessage}</Text>
        ) : isAnswerChecked ? (
          <Text style={[
            styles.feedbackText,
            { color: theme.colors.text }
          ]}>
            {selectedAnswer === currentQuestion.correct
              ? 'That was correct.'
              : attempts >= 2
                ? `That was incorrect. The correct answer is ${currentQuestion.correct}.`
                : 'That was incorrect. Try again.'}
          </Text>
        ) : null}
        
        {isAnswerChecked ? (
          <>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: selectedAnswer === currentQuestion.correct
                    ? theme.colors.correct
                    : theme.colors.incorrect
                }
              ]}
              onPress={
                selectedAnswer === currentQuestion.correct || attempts >= 2
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
                {selectedAnswer === currentQuestion.correct || attempts >= 2
                  ? 'Continue'
                  : 'OK'}
              </Text>
            </TouchableOpacity>
            {selectedAnswer !== currentQuestion.correct && 
             attempts < 2 && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleNext}
              >
                <Text style={styles.skipButtonText}>Skip question</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCheck}
            disabled={isAnswerChecked}
          >
            <Text style={[
              styles.actionButtonText,
              { color: theme.colors.background }  
            ]}>
              {selectedAnswer === currentQuestion.correct || attempts >= 2
                ? 'Jatka'
                : 'Tarkista'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeAreaContainer: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      justifyContent: 'space-between',
    },
    headerTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
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
      backgroundColor: theme.colors.background02,
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
      width: 20,
      height: 20,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scoreNumber: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.sm,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    question: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.lg,
      marginBottom: theme.spacing.md,
    },
    options: {
      gap: theme.spacing.sm,
    },
    optionButton: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background01,
      borderWidth: 1,
      borderColor: theme.colors.stroke,
    },
    optionContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionText: {
      color: theme.colors.text,
      fontSize: theme.fontSizes.md,
      flex: 1,
    },
    selectedOption: {
      borderColor: '#5F79FF',
    },
    correctOption: {
      borderColor: theme.colors.correct,
    },
    wrongOption: {
      borderColor: theme.colors.incorrect,
    },
    selectedOptionText: {
      color: theme.colors.text,
    },
    indicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hiddenIndicator: {
      opacity: 0,
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
      paddingBottom: 34,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
    },
    actionButton: {
      backgroundColor: theme.colors.text,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: theme.fontSizes.md,
      fontWeight: 'medium',
      color: theme.colors.text,
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
    debugText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
  });