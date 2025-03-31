import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { ChevronLeft, Check, X, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { QuizQuestion } from '../types/types';
import { getQuizFromStudySet } from '../services/Database';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';
import { useTranslation } from '../i18n/LanguageContext';
import { Analytics, FeedbackType, FeatureType, EventType } from '../services/AnalyticsService';

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
  const { t } = useTranslation();
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
  
  // Add new state variables for feedback
  const [questionFeedbackSubmitted, setQuestionFeedbackSubmitted] = useState<Record<number, boolean>>({});
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
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
              t('quiz.alerts.noQuestionsTitle'),
              t('quiz.alerts.noQuestionsMessage'),
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        })
        .catch(error => {
          console.error('Error loading quiz questions:', error);
          Alert.alert(
            t('quiz.alerts.loadErrorTitle'),
            t('quiz.alerts.loadErrorMessage'),
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        });
    }
  }, [studySetId, hasInitialQuiz, t]);

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

  useEffect(() => {
    Analytics.logScreenView('Quiz', {
      study_set_id: studySetId,
      question_count: questions.length
    });
    
    // Log feature use
    Analytics.logFeatureUse(FeatureType.QUIZ, {
      study_set_id: studySetId,
      question_count: questions.length
    });
  }, [studySetId, questions.length]);

  useEffect(() => {
    // Start timing when component mounts
    const startTime = Date.now();
    setSessionStartTime(startTime);
    
    // Clean up when component unmounts
    return () => {
      // Calculate duration in seconds
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Only log if duration is reasonable (more than 3 seconds)
      if (durationSeconds > 3) {
        console.log('[Analytics] Logging quiz session duration:', durationSeconds.toFixed(1) + 's');
        
        // Log as SESSION_END event with quiz context
        Analytics.logEvent(EventType.SESSION_END, {
          duration_seconds: durationSeconds,
          context: 'quiz',
          study_set_id: studySetId,
          questions_count: questions?.length || 0
        });
      }
    };
  }, [studySetId]); // Only re-run if study set ID changes

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t('quiz.loading')}</Text>
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
      setValidationMessage(t('quiz.validation.selectAnswer'));
      return;
    }
    
    const isCorrect = selectedAnswer === currentQuestion.correct;
    
    // Track quiz interaction
    Analytics.logEvent(EventType.QUIZ_INTERACTION, {
      study_set_id: studySetId,
      question_index: currentQuestionIndex,
      is_correct: isCorrect,
      attempt_number: attempts + 1
    });
    
    setValidationMessage(null);
    setIsAnswerChecked(true);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setAttempts(0);
    } else {
      if (attempts >= 1) {
        setWrongAnswers(prev => prev + 1);
      }
      setAttempts(prev => prev + 1);
    }
  };

  const handleQuestionFeedback = async (isPositive: boolean) => {
    if (!currentQuestion) return;
    
    try {
      // Log to analytics
      await Analytics.logFeedback(
        FeedbackType.QUIZ_FEEDBACK,
        isPositive,
        {
          study_set_id: studySetId,
          question_index: currentQuestionIndex,
          question_length: currentQuestion.question.length,
          options_count: currentQuestion.options.length
        }
      );
      
      // Mark this question as having received feedback
      setQuestionFeedbackSubmitted(prev => ({
        ...prev,
        [currentQuestionIndex]: true
      }));
      
      // Show the feedback toast
      setShowFeedbackToast(true);
      
      // Automatically hide the toast after 3 seconds
      setTimeout(() => {
        setShowFeedbackToast(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving quiz question feedback:', error);
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
          <Text style={styles.headerTitle}>{t('quiz.title')}</Text>
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

          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity 
                style={styles.feedbackButton} 
                onPress={() => handleQuestionFeedback(true)}
                disabled={questionFeedbackSubmitted[currentQuestionIndex]}
              >
                <ThumbsUp 
                  color={theme.colors.textSecondary}
                  size={16} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.feedbackButton} 
                onPress={() => handleQuestionFeedback(false)}
                disabled={questionFeedbackSubmitted[currentQuestionIndex]}
              >
                <ThumbsDown 
                  color={theme.colors.textSecondary}
                  size={16} 
                />
              </TouchableOpacity>
            </View>
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
              ? t('quiz.feedback.correct')
              : attempts >= 2
                ? t('quiz.feedback.incorrectFinal', { answer: currentQuestion.correct })
                : t('quiz.feedback.incorrect')}
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
                  ? t('quiz.buttons.continue')
                  : t('quiz.buttons.ok')}
              </Text>
            </TouchableOpacity>
            {selectedAnswer !== currentQuestion.correct && 
             attempts < 2 && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleNext}
              >
                <Text style={styles.skipButtonText}>{t('quiz.buttons.skip')}</Text>
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
                ? t('quiz.buttons.continue')
                : t('quiz.buttons.submit')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add feedback toast */}
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
    feedbackContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    feedbackButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: theme.spacing.sm,
    },
    feedbackButton: {
      padding: 8,
      borderRadius: 20,
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