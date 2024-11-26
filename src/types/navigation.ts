export type RootStackParamList = {
  Home: undefined;
  ScanPage: undefined;
  Preview: { photo: { uri: string; base64: string } };
  StudySet: { id: string };
  Flashcards: { studySetId: string };
  Quiz: { studySetId: string };
};
