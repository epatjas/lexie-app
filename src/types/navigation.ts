import { QuizQuestion } from './types';

export type RootStackParamList = {
  Home: undefined;
  ScanPage: undefined;
  Preview: { photo: { uri: string; base64: string } };
  StudySet: { id: string };
  Flashcards: { studySetId: string };
  Quiz: {
    studySetId: string;
    quiz?: QuizQuestion[];
  };
  QuizComplete: {
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: string;
    studySetId: string;
  };
};
