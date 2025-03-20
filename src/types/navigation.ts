import { QuizQuestion } from './types';
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
  StudySet: { id: string };
  Flashcards: { 
    studySetId: string; 
    filterIndices?: number[]; // Optional param to filter cards
  };
  Quiz: { studySetId: string; quiz?: QuizQuestion[] };
  QuizComplete: { 
    studySetId: string;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: string;
  };
  Preview: {
    photos: Array<{
      uri: string;
      base64?: string;
    }>;
    source?: 'camera' | 'imagePicker';
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
  ProfileSelection: undefined;
  Settings: undefined;
  LessonHistory: undefined;
  FlashcardResults: {
    knownCount: number;
    learningCount: number;
    total: number;
    studySetId: string;
    learningIndices: number[];
  };
};

export type SettingsScreenProps = {
  navigation: NavigationProp<RootStackParamList, 'Settings'>;
  onClose: () => void;
  onProfileDeleted: () => void;
};
