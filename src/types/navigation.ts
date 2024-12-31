import { QuizQuestion } from './types';

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
  Flashcards: { studySetId: string };
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
};
