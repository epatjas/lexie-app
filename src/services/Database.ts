import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion, Folder } from '../types/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;

// Add this interface near the top of the file
interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

// Add this function near the top of the file, after the imports
const verifyAndUpdateSchema = async (db: SQLite.SQLiteDatabase) => {
  try {
    console.log('Verifying database schema...');
    
    // Add type annotation to tableInfo
    const tableInfo = await db.getAllAsync<TableColumn>(
      "PRAGMA table_info('study_sets')"
    );
    
    const hasFolder = tableInfo.some(column => column.name === 'folder_id');
    
    if (!hasFolder) {
      console.log('Adding folder_id column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN folder_id TEXT
        REFERENCES folders(id);
      `);
      console.log('Added folder_id column successfully');
    }
  } catch (error) {
    console.error('Schema verification failed:', error);
    throw error;
  }
};

/**
 * Initializes the database schema.
 * Creates necessary tables if they don't exist.
 * @returns Promise<void>
 */
export const initDatabase = async (): Promise<void> => {
  if (isInitializing) {
    console.log('Database initialization already in progress...');
    return;
  }

  try {
    isInitializing = true;
    console.log('Initializing database...');
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Create folders table first
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    console.log('Folders table created/verified');

    // Create study_sets table with folder_id reference
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        text_content TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        folder_id TEXT,
        FOREIGN KEY (folder_id) REFERENCES folders(id)
      );
    `);
    console.log('Study sets table created/verified');

    // Create other tables...
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);
    console.log('Flashcards table created/verified');

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
    console.log('Quiz questions table created/verified');

    // Verify and update schema if needed
    await verifyAndUpdateSchema(db);

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    // If we already have a connection, return it
    if (db !== null) {
      return db;
    }

    console.log('Opening new database connection...');
    db = await SQLite.openDatabaseAsync('studysets.db');
    
    // Initialize tables
    await initDatabase();
    
    return db;
  } catch (error) {
    console.error('Failed to get database:', error);
    throw error;
  }
};

// Add a cleanup function to close the database
export const closeDatabase = async () => {
  if (db) {
    try {
      await db.closeAsync();
      db = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
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

    // Create flashcards if they exist
    if (input.flashcards && input.flashcards.length > 0) {
      console.log('Creating flashcards:', input.flashcards);
      await createFlashcards(id, input.flashcards);
    }

    // Create quiz if it exists
    if (input.quiz && input.quiz.length > 0) {
      console.log('Creating quiz:', input.quiz);
      await createQuiz(id, input.quiz);
    }

    return {
      id,
      title: input.title,
      text_content: input.text_content,
      created_at: now,
      updated_at: now
    };
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

export const createQuiz = async (studySetId: string, questions: QuizQuestion[]): Promise<void> => {
  try {
    const db = await getDatabase();
    console.log('Creating quiz for study set:', studySetId);
    
    // First, clear any existing questions for this study set
    await db.runAsync(
      'DELETE FROM quiz_questions WHERE study_set_id = ?',
      [studySetId]
    );
    
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
    
    console.log('Quiz created successfully');
  } catch (error) {
    console.error('Failed to create quiz:', error);
    throw error;
  }
};

export const getFlashcardsFromStudySet = async (studySetId: string): Promise<Flashcard[]> => {
  const db = await getDatabase();
  
  try {
    console.log('Getting flashcards for study set:', studySetId);
    
    // First verify the study set exists
    const studySet = await db.getFirstAsync(
      'SELECT id FROM study_sets WHERE id = ?',
      [studySetId]
    );
    console.log('Found study set:', studySet);

    // Then get the flashcards
    const results = await db.getAllAsync<Flashcard>(
      `SELECT id, study_set_id, front, back 
       FROM flashcards 
       WHERE study_set_id = ?`,
      [studySetId]
    );
    
    console.log('Database query results:', results);
    
    if (!results || results.length === 0) {
      console.log('No flashcards found in database for study set:', studySetId);
    }
    
    return results;
  } catch (error) {
    console.error('Error in getFlashcardsFromStudySet:', error);
    throw error;
  }
};

export const createFlashcards = async (studySetId: string, flashcards: { front: string; back: string }[]): Promise<void> => {
  try {
    const db = await getDatabase();
    console.log('Creating flashcards for study set:', studySetId);
    
    // First, clear any existing flashcards for this study set
    await db.runAsync(
      'DELETE FROM flashcards WHERE study_set_id = ?',
      [studySetId]
    );
    
    // Insert each flashcard
    for (const card of flashcards) {
      console.log('Inserting flashcard:', card);
      await db.runAsync(
        `INSERT INTO flashcards (id, study_set_id, front, back) 
         VALUES (?, ?, ?, ?)`,
        [uuidv4(), studySetId, card.front, card.back]
      );
    }
    
    console.log('Flashcards created successfully');
  } catch (error) {
    console.error('Failed to create flashcards:', error);
    throw error;
  }
};

// Add folder-related database functions
export const createFolder = async (folder: { name: string; color: string }): Promise<Folder> => {
  try {
    const db = await getDatabase();
    const id = uuidv4();
    const now = Date.now(); // Use timestamp instead of ISO string for consistency
    
    await db.runAsync(
      `INSERT INTO folders (id, name, color, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, folder.name, folder.color, now, now]
    );
    
    return {
      id,
      ...folder,
      created_at: now.toString(),
      updated_at: now.toString(),
    };
  } catch (error) {
    console.error('Failed to create folder:', error);
    throw error;
  }
};

export const getFolders = async (): Promise<Folder[]> => {
  try {
    const db = await getDatabase();
    const folders = await db.getAllAsync<Folder>(
      'SELECT * FROM folders ORDER BY created_at DESC'
    );
    return folders;
  } catch (error) {
    console.error('Failed to get folders:', error);
    throw error;
  }
};

export const updateStudySetFolder = async (studySetId: string, folderId: string | null): Promise<void> => {
  try {
    const db = await getDatabase();
    console.log(`Assigning study set ${studySetId} to folder ${folderId}`); // Debug log
    
    await db.runAsync(
      'UPDATE study_sets SET folder_id = ? WHERE id = ?',
      [folderId, studySetId]
    );

    // Verify the update
    const updatedSet = await db.getFirstAsync(
      'SELECT * FROM study_sets WHERE id = ?',
      [studySetId]
    );
    console.log('Updated study set:', updatedSet); // Debug log
  } catch (error) {
    console.error('Failed to update study set folder:', error);
    throw error;
  }
};

export const updateFolder = async (folderId: string, updates: { name?: string; color?: string }): Promise<void> => {
  try {
    const db = await getDatabase();
    const now = Date.now();
    
    const updateFields = [];
    const values = [];
    
    if (updates.name) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(folderId);

    await db.runAsync(
      `UPDATE folders SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
  } catch (error) {
    console.error('Failed to update folder:', error);
    throw error;
  }
};

export const clearDatabase = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Drop all tables in the correct order (due to foreign key constraints)
    await db.execAsync('DROP TABLE IF EXISTS quiz_questions;');
    await db.execAsync('DROP TABLE IF EXISTS flashcards;');
    await db.execAsync('DROP TABLE IF EXISTS study_sets;');
    await db.execAsync('DROP TABLE IF EXISTS folders;');
    
    // Reinitialize the database with fresh tables
    await initDatabase();
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
};

