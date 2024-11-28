export interface StudySet {
    id: string;
    title: string;
    text_content: string;
    created_at: number;
    updated_at: number;
    flashcards?: Flashcard[];
    quiz?: QuizQuestion[];
    folder_id?: string | null;
  }
  
  export interface CreateStudySetInput {
    title: string;
    text_content: string;
    flashcards?: {
      front: string;
      back: string;
    }[];
    quiz?: {
      question: string;
      options: string[];
      correct: string;
    }[];
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
    text_content: string;
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

  export interface Folder {
    id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
  }