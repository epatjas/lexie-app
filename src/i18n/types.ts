export type SupportedLanguage = 'en' | 'fi';

export interface TranslationKeys {
  common: {
    appName: string;
    save: string;
    cancel: string;
    next: string;
    back: string;
    close: string;
    loading: string;
  };
  welcome: {
    title: string;
    description: string;
    startButton: string;
  };
  home: {
    greeting: string;
    questionPrompt: string;
    startLesson: string;
    lessons: string;
  };
  studySet: {
    title: string;
    summary: string;
    quiz: string;
    flashcards: string;
    original: string;
    listen: string;
    howToApproach: string;
    problemSummary: string;
  };
  processing: {
    justAMoment: string;
    readingWork: string;
    creatingLesson: string;
    organizingContent: string;
    formingQuestions: string;
    convertingToAudio: string;
    almostReady: string;
    finalizingMaterials: string;
  };
  homeworkHelp: {
    introduction: {
      fi: string;
      en: string;
    };
  };
  settings: {
    title: string;
    language: string;
    profile: string;
    about: string;
  };
} 