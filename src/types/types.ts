export interface StudySet {
    id: string;
    title: string;
    description: string;
    created_at: number;
    updated_at: number;
  }
  
  export interface CreateStudySetInput {
    title: string;
    description: string;
    flashcards?: Flashcard[];
    quiz?: QuizQuestion[];
  }
  
  export interface Flashcard {
    front: string;
    back: string;
  }
  
  export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
  }

  export interface StudyMaterials {
    title: string;
    text: string;
    flashcards: Flashcard[];
    quiz: QuizQuestion[];
  }