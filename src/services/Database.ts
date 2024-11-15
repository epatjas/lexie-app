import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion } from '../types/types';

// Open database
const db = SQLite.openDatabaseSync('studysets.db');

// Initialize database with required tables
export const initDatabase = () => {
  try {
    // Create study_sets table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        text_content TEXT,
        created_at TEXT
      );
    `);

    // Create flashcards table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT,
        front_text TEXT,
        back_text TEXT,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);

    // Create quiz_questions table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT,
        question TEXT,
        options TEXT,
        correct_answer TEXT,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);

    // Enable foreign key support
    db.execSync('PRAGMA foreign_keys = ON;');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Create a new study set with its flashcards and quiz questions
export const createStudySet = (
  studySet: CreateStudySetInput
): string => {
  try {
    const studySetId = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();

    // Insert study set
    db.runSync(
      'INSERT INTO study_sets (id, title, text_content, created_at) VALUES (?, ?, ?, ?)',
      [studySetId, studySet.title || '', studySet.text || '', timestamp]
    );

    // Insert flashcards
    studySet.flashcards?.forEach((card) => {
      const cardId = Math.random().toString(36).substring(7);
      db.runSync(
        'INSERT INTO flashcards (id, study_set_id, front_text, back_text) VALUES (?, ?, ?, ?)',
        [cardId, studySetId, card.front, card.back]
      );
    });

    // Insert quiz questions
    studySet.quiz?.forEach((question) => {
      const questionId = Math.random().toString(36).substring(7);
      db.runSync(
        'INSERT INTO quiz_questions (id, study_set_id, question, options, correct_answer) VALUES (?, ?, ?, ?, ?)',
        [
          questionId,
          studySetId,
          question.question,
          JSON.stringify(question.options),
          question.correctAnswer,
        ]
      );
    });

    return studySetId;
  } catch (error) {
    console.error('Error creating study set:', error);
    throw error;
  }
};

// Get all study sets with their flashcards and quiz questions
export const getStudySets = (): StudySet[] => {
  try {
    const studySets = db.getAllSync<any>('SELECT * FROM study_sets ORDER BY created_at DESC');

    return studySets.map((set) => {
      // Get flashcards for this study set
      const flashcards = db.getAllSync<Flashcard>(
        'SELECT * FROM flashcards WHERE study_set_id = ?',
        [set.id]
      );

      // Get quiz questions for this study set
      const quizQuestions = db.getAllSync<any>(
        'SELECT * FROM quiz_questions WHERE study_set_id = ?',
        [set.id]
      ).map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));

      return {
        id: set.id,
        title: set.title,
        text: set.text_content,
        createdAt: new Date(set.created_at),
        flashcards,
        quiz: quizQuestions,
      };
    });
  } catch (error) {
    console.error('Error getting study sets:', error);
    throw error;
  }
};

// Delete a study set and its related content
export const deleteStudySet = (id: string): void => {
  try {
    // Due to ON DELETE CASCADE, this will automatically delete related flashcards and quiz questions
    db.runSync('DELETE FROM study_sets WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error deleting study set:', error);
    throw error;
  }
};
