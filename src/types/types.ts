export interface StudySet {
    id: string;
    title: string;
    description: string;
    text: string;
    created_at: number;
    updated_at: number;
    flashcards?: Flashcard[];
    quiz?: QuizQuestion[];
  }
  
  export interface CreateStudySetInput {
    title: string;
    description: string;
    text: string;
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
    correct: string;
  }

  export interface StudyMaterials {
    title: string;
    text: string;
    flashcards: Flashcard[];
    quiz: QuizQuestion[];
  }

  interface OpenAIResponse {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  }

  export interface ApiResponse extends OpenAIResponse {
    // ... other fields if needed
  }