import { QuizQuestion } from './types';

export type RootStackParamList = {
  Home: undefined;
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
    photo: {
      uri: string;
      base64: string;
    };
  };
  ScanPage: undefined;
  Folder: {
    folderId: string;
  };
};
