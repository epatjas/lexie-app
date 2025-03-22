// Common base interface for both content types
export interface BaseContent {
  id?: string;
  title: string;
  text_content: {
    raw_text: string;
    sections: Array<any>; // Could be more specific if needed
  };
  introduction?: string;
  summary?: string;
  created_at?: number | string;
  updated_at?: number | string;
  profile_id?: string;
  folder_id?: string;
  processingId?: string;
}

// Study Set specific interface
export interface StudySet extends BaseContent {
  contentType: 'study-set';
  flashcards: Array<{ front: string; back: string }>;
  quiz: Array<{
    question: string;
    options: string[];
    correct: string;
    explanation?: string;
  }>;
}

// Homework Help specific interface
export interface HomeworkHelp extends BaseContent {
  contentType: 'homework-help';
  homeworkHelp: {
    type?: string;
    classification?: string;
    subject_area?: string;
    language?: string;
    assignment: {
      facts: string[];
      objective: string;
    };
    concept_cards: Array<{
      card_number: number;
      title: string;
      explanation: string;
      hint: string;
    }>;
  };
}

// Discriminated union type - use this as the main type
export type StudyMaterials = StudySet | HomeworkHelp;

// If you have a legacy StudyMaterials interface elsewhere, rename it
// export interface LegacyStudyMaterials { ... }

export interface CreateStudySetInput {
  title: string;
  introduction?: string;
  summary?: string;
  contentType?: 'study-set';
  text_content: {
    raw_text: string;
    sections: Array<any>;
  };
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  profile_id?: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  study_set_id: string;
  question: string;
  options: string[];
  correct: string;
}

export interface TextSection {
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'definition';
  level?: number;  // for headings
  items?: string[];  // for lists
  raw_text: string;
}

export interface TextContent {
  raw_text: string;
  sections: TextSection[];
}

export interface StudySetData {
  id?: string;
  title: string;
  introduction?: string;
  summary?: string;
  text_content: {
    raw_text: string;
    sections: Array<any>;
  };
  contentType?: 'study-set';
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  created_at?: number | string;
  updated_at?: number | string;
  profile_id?: string;
  folder_id?: string;
  processingId?: string;
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

export interface ConceptCard {
  card_number: number;
  title: string;
  explanation: string;
  hint: string;
}
