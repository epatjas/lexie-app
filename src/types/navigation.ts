import { QuizQuestion, QuizResult } from './types';
import { NavigationProp, RouteProp } from '@react-navigation/native';

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
  NameInput: undefined;
  ProfileImage: undefined;
  ProfileSelection: undefined;
  StudySet: { id: string };
  Flashcards: { 
    studySetId: string; 
    filterIndices?: number[]; // Optional param to filter cards
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
  Preview: { document: Document };
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
};

export type SettingsScreenProps = {
  navigation: NavigationProp<RootStackParamList, 'Settings'>;
  onClose: () => void;
  onProfileDeleted: () => void;
};

export interface Quiz {
  questions: QuizQuestion[];
  // Add any other properties your Quiz type needs
}
