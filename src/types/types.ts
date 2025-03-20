export interface StudySet {
    id: string;
    title: string;
    text_content: TextContent;
    created_at: string | number;
    updated_at: string | number;
    subject?: string;
    flashcards?: Flashcard[];
    quiz?: QuizQuestion[];
    folder_id?: string | null;
    profile_id: string;
  }
  
  export interface CreateStudySetInput {
    title: string;
    text_content: TextContent;
    profile_id: string;
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

  export interface TextSection {
    type: 'heading' | 'paragraph' | 'list' | 'quote' | 'definition';
    level?: number;  // for headings
    items?: string[];  // for lists
    raw_text: string;
    sections: TextSection[];
  }

  export interface TextContent {
    raw_text: string;
    sections: TextSection[];
  }

  export interface StudyMaterials {
    title: string;
    text_content: {
      raw_text: string;
      sections: TextSection[];
    };
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

  export interface TranscriptionResponse {
    title: string;
    text_content: {
      raw_text: string;
      sections: TextSection[];
    };
  }

  export interface Profile {
    id: string;
    name: string;
    avatarId: string;
  }

  export interface FolderWithCount {
    id: string;
    name: string;
    count: number;
    study_sets?: string[];
  }

  export interface QuizResult {
    correctAnswers: boolean[];
    studySetId: string;
  }