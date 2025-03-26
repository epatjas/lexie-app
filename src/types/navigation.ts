import { QuizQuestion, QuizResult, Flashcard } from './types';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { FontSettings } from '../types/fontSettings';

console.log('[navigation.ts] Loading navigation type definitions');

export type RootStackParamList = {
  Home: {
    refresh?: boolean;
    openBottomSheet?: boolean;
    existingPhotos?: Array<{
      uri: string;
      base64?: string;
    }>;
  } | undefined;
  Welcome: undefined;
  NameInput: { profileId?: string };
  ProfileImage: { profileId: string };
  ProfileSelection: { switchProfile?: boolean };
  StudySet: { 
    id: string; 
    contentType?: 'study-set' | 'homework-help';
    fontSettings?: FontSettings 
  };
  Flashcards: { 
    studySetId: string; 
    title?: string;                // Make title optional
    flashcards?: Flashcard[];      // Make flashcards optional
    filterIndices?: number[];      // Keep filterIndices optional
  };
  Quiz: {
    quiz?: QuizQuestion[];
    studySetId: string;
  };
  QuizComplete: {
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: string;
    studySetId: string;
  };
  Preview: { 
    photos: Array<{
      uri: string;
      base64?: string;
    }>;
    document?: Document; // Keep document as optional if it's still needed
  };
  ScanPage: {
    openBottomSheet?: boolean;
    existingPhotos?: Array<{
      uri: string;
      base64?: string;
    }>;
  };
  Folder: {
    folderId: string;
  };
  Settings: undefined;
  LessonHistory: undefined;
  FlashcardResults: {
    knownCount: number;
    learningCount: number;
    total: number;
    studySetId: string;
    learningIndices: number[];
  };
  ProfileSettings: undefined;
  FontSelection: undefined;
  ConceptCardScreen: {
    homeworkHelpId: string;
    title: string;
    cards: Array<{
      card_number: number;
      title: string;
      explanation: string;
      hint: string;
    }>;
  };
  FlashcardScreen: {
    studySetId: string;
    title: string;
    flashcards: Flashcard[];
  };
  ContentNavigator: {
    id: string;
    contentType?: string;
  };
  Feedback: undefined;
};

console.log('[navigation.ts] RootStackParamList defined with these screens:', 
  Object.keys({}as RootStackParamList).join(', '));
console.log('[navigation.ts] ConceptCardScreen params defined:', 
  'ConceptCardScreen' in ({} as RootStackParamList));

export type SettingsScreenProps = {
  navigation: NavigationProp<RootStackParamList, 'Settings'>;
  onClose: () => void;
  onProfileDeleted: () => void;
};

export interface Quiz {
  questions: QuizQuestion[];
  // Add any other properties your Quiz type needs
}
