import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion } from '../types/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Singleton pattern: Maintain a single database connection throughout the app
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Gets or creates a database connection.
 * Uses singleton pattern to avoid multiple database connections.
 * @returns Promise<SQLite.SQLiteDatabase> - The database connection
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    console.log('Attempting to get database connection...');
    if (db === null) {
      console.log('Opening new database connection...');
      try {
        // Use openDatabaseAsync instead of openDatabase
        db = await SQLite.openDatabaseAsync('studysets.db');
        console.log('Database connection successful');
        
        // Create tables
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS study_sets (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            text_content TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
        `);

        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS flashcards (
            id TEXT PRIMARY KEY NOT NULL,
            study_set_id TEXT NOT NULL,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
          );
        `);

        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS quiz_questions (
            id TEXT PRIMARY KEY NOT NULL,
            study_set_id TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct TEXT NOT NULL,
            FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
          );
        `);

      } catch (error) {
        console.error('Error opening database:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
    }
    return db;
  } catch (error) {
    console.error('Failed to get database:', error);
    throw error;
  }
};

/**
 * Initializes the database schema.
 * Creates necessary tables if they don't exist.
 * @returns Promise<void>
 */
export const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Drop existing tables if they exist (CAUTION: this will delete existing data)
    await db.execAsync(`DROP TABLE IF EXISTS quiz_questions;`);
    await db.execAsync(`DROP TABLE IF EXISTS flashcards;`);
    await db.execAsync(`DROP TABLE IF EXISTS study_sets;`);
    
    // Create study_sets table with text_content column
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        text_content TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create flashcards table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);

    // Create quiz_questions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct TEXT NOT NULL,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Retrieves a specific study set by ID.
 * @param id - The unique identifier of the study set
 * @returns Promise<StudySet | null> - The study set if found, null otherwise
 */
export const getStudySet = async (id: string): Promise<StudySet> => {
  try {
    const db = await getDatabase();
    console.log('Fetching study set with id:', id);
    
    const studySet = await db.getFirstAsync<StudySet>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    
    console.log('Retrieved study set:', studySet);
    
    if (!studySet) {
      throw new Error(`Study set with id ${id} not found`);
    }

    return studySet;
  } catch (error) {
    console.error('Failed to get study set:', error);
    throw error;
  }
};

/**
 * Creates a new study set in the database.
 * @param input - The study set data to insert (title, description, etc.)
 * @returns Promise<StudySet> - The created study set with generated ID and timestamps
 */
export const createStudySet = async (input: CreateStudySetInput): Promise<StudySet> => {
  try {
    const db = await getDatabase();
    console.log('Creating study set with input:', input);

    const now = Date.now();
    const id = uuidv4();

    // Create the study set
    await db.runAsync(
      `INSERT INTO study_sets (id, title, text_content, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.title, input.text_content, now, now]
    );

    // If there are quiz questions in the input, save them
    if (input.quiz && input.quiz.length > 0) {
      console.log('Saving quiz questions...');
      for (const question of input.quiz) {
        await db.runAsync(
          `INSERT INTO quiz_questions (id, study_set_id, question, options, correct) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            id,
            question.question,
            JSON.stringify(question.options),
            question.correct
          ]
        );
      }
      console.log(`Saved ${input.quiz.length} quiz questions`);
    }

    // Fetch the created record
    const studySet = await db.getFirstAsync<StudySet>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );

    if (!studySet) {
      throw new Error('Failed to create study set');
    }

    console.log('Study set created successfully:', studySet);
    return studySet;
  } catch (error) {
    console.error('Failed to create study set:', error);
    throw error;
  }
};

/**
 * Utility function to execute raw SQL queries.
 * @param query - The SQL query to execute
 * @param params - Array of parameters to bind to the query
 * @returns Promise<SQLite.SQLiteRunResult> - The result of the query execution
 */
export const executeQuery = async (query: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> => {
  try {
    const db = await getDatabase();
    const result = await db.runAsync(query, params);
    return result;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
};

// First, let's create an interface for the raw database quiz question
interface RawQuizQuestion {
  id: string;
  study_set_id: string;
  question: string;
  options: string; // This is the JSON string from the database
  correct: string;
}

/**
 * Retrieves a complete study set with all materials by ID.
 * @param id - The unique identifier of the study set
 * @returns Promise<StudySet | null> - The complete study set if found, null otherwise
 */
export const getCompleteStudySet = async (id: string): Promise<StudySet | null> => {
  try {
    const db = await getDatabase();
    
    // Get the study set
    const studySet = await db.getFirstAsync<StudySet>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    
    if (!studySet) return null;
    
    // Get flashcards
    const flashcards = await db.getAllAsync<Flashcard>(
      'SELECT * FROM flashcards WHERE study_set_id = ?',
      [id]
    );
    
    // Get quiz questions
    const quizQuestions = await db.getAllAsync<RawQuizQuestion>(
      'SELECT * FROM quiz_questions WHERE study_set_id = ?',
      [id]
    );
    
    // Parse the options from JSON string back to array
    const parsedQuizQuestions = quizQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options) as string[] // Add type assertion here
    }));
    
    return {
      ...studySet,
      flashcards,
      quiz: parsedQuizQuestions
    };
  } catch (error) {
    console.error('Failed to get complete study set:', error);
    throw error;
  }
};

// Add this debug function to test database connection
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    console.log('Testing database connection...');
    const db = await getDatabase();
    console.log('Database connection successful');
    
    // Try a simple query
    const result = await db.getFirstAsync('SELECT 1');
    console.log('Test query result:', result);
  } catch (error) {
    console.error('Database test failed:', error);
    throw error;
  }
};

// Add this helper function to verify database state
export const verifyDatabaseTables = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Check if tables exist
    const tables = await db.getAllAsync<{name: string}>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    console.log('Existing tables:', tables);
    
    // Try to get counts from each table
    const studySetsCount = await db.getFirstAsync<{count: number}>(
      'SELECT COUNT(*) as count FROM study_sets'
    );
    
    console.log('Database verification:', {
      tablesExist: tables.map(t => t.name),
      studySetsCount: studySetsCount?.count
    });
    
  } catch (error) {
    console.error('Database verification failed:', error);
    throw error;
  }
};

export const getAllStudySets = async (): Promise<StudySet[]> => {
  try {
    const db = await getDatabase();
    const studySets = await db.getAllAsync<StudySet>(
      'SELECT id, title, text_content, created_at, updated_at FROM study_sets ORDER BY created_at DESC'
    );
    return studySets;
  } catch (error) {
    console.error('Failed to get study sets:', error);
    throw error;
  }
};

// Add this function to Database.ts
export const getQuizFromStudySet = async (studySetId: string): Promise<QuizQuestion[]> => {
  try {
    const db = await getDatabase();
    
    // Get quiz questions for the study set
    const rawQuizQuestions = await db.getAllAsync<RawQuizQuestion>(
      'SELECT * FROM quiz_questions WHERE study_set_id = ?',
      [studySetId]
    );
    
    // Parse the options from JSON string back to array
    const quizQuestions = rawQuizQuestions.map(q => ({
      question: q.question,
      options: JSON.parse(q.options) as string[],
      correct: q.correct
    }));
    
    return quizQuestions;
  } catch (error) {
    console.error('Failed to get quiz questions:', error);
    throw error;
  }
};

// Add this test function
export const createTestQuiz = async (studySetId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Sample quiz questions
    const questions: QuizQuestion[] = [
      {
        question: "What is the capital of Finland?",
        options: ["Helsinki", "Stockholm", "Oslo", "Copenhagen"],
        correct: "Helsinki"
      },
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correct: "4"
      }
    ];
    
    // Insert each question
    for (const q of questions) {
      await db.runAsync(
        `INSERT INTO quiz_questions (id, study_set_id, question, options, correct) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          studySetId,
          q.question,
          JSON.stringify(q.options),
          q.correct
        ]
      );
    }
    
    console.log('Test quiz created successfully');
  } catch (error) {
    console.error('Failed to create test quiz:', error);
    throw error;
  }
};
