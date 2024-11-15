export type CreateStudySetInput = Omit<StudySet, 'id' | 'createdAt'>;

export interface StudySet {
    id: string;
    title: string;
    text: string;
    flashcards: Flashcard[];
    quiz: QuizQuestion[];
    createdAt: Date;
  }
  
  export interface Flashcard {
    id: string;
    study_set_id: string;
    front: string;
    back: string;
  }
  
  export interface QuizQuestion {
    id: string;
    study_set_id: string;
    question: string;
    options: string[];
    correctAnswer: string;
  }