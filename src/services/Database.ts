import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion, Folder } from '../types/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let tablesInitialized = false;

// Add this interface near the top of the file
interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

// Add this type near the top of the file with other interfaces
interface SQLTransaction {
  executeSql: (
    sqlStatement: string,
    args?: (string | number | null)[]
  ) => Promise<{
    rows: {
      length: number;
      _array: any[];
      item: (idx: number) => any;
    };
    insertId?: number;
    rowsAffected: number;
  }>;
}

// Add this function near the top of the file, after the imports
const verifyAndUpdateSchema = async (db: SQLite.SQLiteDatabase) => {
  try {
    console.log('Verifying database schema...');
    
    // Check study_sets table structure
    const studySetsInfo = await db.getAllAsync<TableColumn>(
      "PRAGMA table_info('study_sets')"
    );
    console.log('Study sets table structure:', studySetsInfo);
    
    const hasFolder = studySetsInfo.some(column => column.name === 'folder_id');
    
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

const DB_VERSION = 2; // Increment this when schema changes

/**
 * Initializes the database schema.
 * Creates necessary tables if they don't exist.
 * @returns Promise<void>
 */
export const initDatabase = async (): Promise<void> => {
  if (isInitializing) {
    if (initializationPromise) {
      return initializationPromise;
    }
    return;
  }

  try {
    isInitializing = true;
    
    initializationPromise = (async () => {
      if (db) {
        await db.closeAsync();
        db = null;
      }

      db = await SQLite.openDatabaseAsync('studysets.db');
      
      if (!tablesInitialized) {
        await initTables(db);
        tablesInitialized = true;
      }
    })();

    await initializationPromise;
  } catch (error) {
    console.error('Database initialization failed:', error);
    db = null;
    throw error;
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    await initializationPromise;
    if (db) return db;
  }

  // If no initialization is in progress, start a new one
  if (!isInitializing) {
    db = await SQLite.openDatabaseAsync('studysets.db');
    await initTables(db);
    return db;
  }

  throw new Error('Database initialization failed');
};

// Separate table initialization into its own function
const initTables = async (database: SQLite.SQLiteDatabase) => {
  try {
    // First verify schema
    await verifyAndUpdateSchema(database);
    
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        folder_id TEXT REFERENCES folders(id),
        text_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_id TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // After creating tables, verify the structure
    const tableInfo = await database.getAllAsync("PRAGMA table_info('study_sets')");
    console.log('Study sets table structure after init:', tableInfo);
    
    tablesInitialized = true;
  } catch (error) {
    console.error('Error initializing tables:', error);
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
 * @returns Promise<StudySet> - The study set if found, null otherwise
 */
export const getStudySet = async (id: string): Promise<StudySet> => {
  try {
    const db = await getDatabase();
    console.log('Fetching study set with id:', id);
    
    const rawStudySet = await db.getFirstAsync<StudySet & { text_content: string }>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    
    if (!rawStudySet) {
      throw new Error(`Study set with id ${id} not found`);
    }

    // Parse the text_content JSON string back to object
    const studySet: StudySet = {
      ...rawStudySet,
      text_content: JSON.parse(rawStudySet.text_content)
    };
    
    console.log('Retrieved study set:', studySet);
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
    console.log('=== Starting Study Set Creation ===');
    console.log('Input:', JSON.stringify(input, null, 2));

    const now = Date.now();
    const id = uuidv4();
    console.log('Generated ID:', id);

    // Log the exact SQL and parameters being used
    const sql = `INSERT INTO study_sets (id, title, text_content, created_at, updated_at, profile_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [id, input.title, JSON.stringify(input.text_content), now, now, input.profile_id];
    
    console.log('Executing SQL:', sql);
    console.log('With parameters:', params);

    await db.runAsync(sql, params);
    console.log('Study set inserted successfully');

    // Verify the insertion
    const inserted = await db.getFirstAsync('SELECT * FROM study_sets WHERE id = ?', [id]);
    console.log('Verification query result:', inserted);

    // Create flashcards if they exist
    if (input.flashcards && input.flashcards.length > 0) {
      await createFlashcards(id, input.flashcards);
    }

    // Create quiz questions if they exist from OpenAI response
    if (input.quiz && input.quiz.length > 0) {
      await createQuiz(id, input.quiz);
      console.log('Created quiz questions from OpenAI response');
    }

    const createdSet = await getCompleteStudySet(id);
    if (!createdSet) {
      throw new Error('Failed to retrieve created study set');
    }

    return createdSet;
  } catch (error) {
    console.error('Detailed error in createStudySet:', error);
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
  options: string; // JSON string in database
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
    
    const rawStudySet = await db.getFirstAsync<any>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    
    if (!rawStudySet) return null;
    
    // Parse the text_content JSON
    const studySet: StudySet = {
      ...rawStudySet,
      text_content: JSON.parse(rawStudySet.text_content)
    };
    
    // Get flashcards and quiz questions
    const flashcards = await db.getAllAsync<Flashcard>(
      'SELECT * FROM flashcards WHERE study_set_id = ?',
      [id]
    );
    
    const quizQuestions = await db.getAllAsync<RawQuizQuestion>(
      'SELECT * FROM quiz_questions WHERE study_set_id = ?',
      [id]
    );
    
    const parsedQuizQuestions = quizQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options) as string[]
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

export const getAllStudySets = async (profileId: string): Promise<StudySet[]> => {
  try {
    const db = await getDatabase();
    console.log('Fetching study sets for profile:', profileId);
    
    // Use * to get all columns and avoid schema mismatches
    const results = await db.getAllAsync<StudySet>(
      `SELECT s.*, f.name as folder_name 
       FROM study_sets s 
       LEFT JOIN folders f ON s.folder_id = f.id 
       WHERE s.profile_id = ? 
       ORDER BY s.created_at DESC`,
      [profileId]
    );
    
    // Parse text_content if needed
    const parsedResults = results.map(set => ({
      ...set,
      text_content: typeof set.text_content === 'string' 
        ? JSON.parse(set.text_content) 
        : set.text_content
    }));
    
    console.log('Study sets query results:', parsedResults);
    return parsedResults;
  } catch (error) {
    console.error('Error in getAllStudySets:', error);
    throw error;
  }
};

// Add this debug function to check table structure
export const debugQuizTable = async () => {
  try {
    const db = await getDatabase();
    console.log('Checking quiz_questions table structure...');
    
    // Check if table exists
    const tableInfo = await db.getAllAsync<TableColumn>(
      "PRAGMA table_info('quiz_questions')"
    );
    console.log('Quiz table structure:', tableInfo);
    
    // Check all quiz questions in the database
    const allQuestions = await db.getAllAsync(
      'SELECT * FROM quiz_questions'
    );
    console.log('All quiz questions in database:', allQuestions);
    
    // Check study set IDs that have questions
    const studySetIds = await db.getAllAsync(
      'SELECT DISTINCT study_set_id FROM quiz_questions'
    );
    console.log('Study set IDs with questions:', studySetIds);
    
  } catch (error) {
    console.error('Error debugging quiz table:', error);
  }
};

// Update getQuizFromStudySet to properly handle JSON string options
export const getQuizFromStudySet = async (studySetId: string): Promise<QuizQuestion[]> => {
  try {
    console.log('Getting quiz for study set:', studySetId);
    const db = await getDatabase();
    
    // Get raw questions with string options
    const rawQuestions = await db.getAllAsync<RawQuizQuestion>(
      'SELECT * FROM quiz_questions WHERE study_set_id = ?',
      [studySetId]
    );
    
    console.log('Raw questions from database:', rawQuestions);
    
    // Parse the options JSON string into array
    const questions = rawQuestions.map(q => ({
      id: q.id,
      study_set_id: q.study_set_id,
      question: q.question,
      options: JSON.parse(q.options),
      correct: q.correct
    }));
    
    console.log('Parsed questions:', questions);
    return questions;
  } catch (error) {
    console.error('Failed to get quiz questions:', error);
    throw error;
  }
};

// Update the helper function to handle different option formats
const stripOptionPrefix = (option: string): string => {
  // Remove only the letter prefix formats: "A) ", "A. ", "A ", etc.
  return option.replace(/^[A-D][\.\)]\s*/, '');
};

// Update createQuiz to handle the OpenAI response format
export const createQuiz = async (studySetId: string, questions: QuizQuestion[]): Promise<void> => {
  try {
    const db = await getDatabase();
    console.log('Creating quiz for study set:', studySetId);
    
    // First, clear existing questions
    await db.runAsync(
      'DELETE FROM quiz_questions WHERE study_set_id = ?',
      [studySetId]
    );
    
    // Insert each question
    for (const q of questions) {
      // Clean up options if they have prefixes
      const cleanOptions = q.options.map(stripOptionPrefix);
      
      console.log('Processing question:', {
        question: q.question,
        originalOptions: q.options,
        cleanedOptions: cleanOptions
      });
      
      const optionsString = JSON.stringify(cleanOptions);
      
      await db.runAsync(
        `INSERT INTO quiz_questions (id, study_set_id, question, options, correct) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          studySetId,
          q.question,
          optionsString,
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
  if (!flashcards || !Array.isArray(flashcards)) {
    console.error('Invalid flashcards input:', flashcards);
    throw new Error('Invalid flashcards input');
  }

  try {
    const db = await getDatabase();
    console.log('Creating flashcards for study set:', studySetId);
    console.log('Flashcards to create:', JSON.stringify(flashcards, null, 2));
    
    // First, clear any existing flashcards for this study set
    await db.runAsync(
      'DELETE FROM flashcards WHERE study_set_id = ?',
      [studySetId]
    );
    console.log('Cleared existing flashcards');
    
    // Insert each flashcard
    for (const card of flashcards) {
      console.log('Inserting flashcard:', JSON.stringify(card, null, 2));
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
    console.log(`Assigning study set ${studySetId} to folder ${folderId}`);
    
    await db.runAsync(
      'UPDATE study_sets SET folder_id = ? WHERE id = ?',
      [folderId, studySetId]
    );

    // Verify the update
    const updatedSet = await db.getFirstAsync(
      'SELECT * FROM study_sets WHERE id = ?',
      [studySetId]
    );
    console.log('Updated study set:', updatedSet);
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

// Update createQuizQuestions to properly format questions from flashcards
export const createQuizQuestions = async (studySetId: string, flashcards: { front: string; back: string }[]): Promise<void> => {
  try {
    const db = await getDatabase();
    console.log('Creating quiz questions from flashcards for study set:', studySetId);
    
    const questions: QuizQuestion[] = flashcards.map(card => {
      // Create wrong answers (you might want to improve this logic)
      const wrongAnswers = [
        'Incorrect answer 1',
        'Incorrect answer 2',
        'Incorrect answer 3'
      ];
      
      // Create options array without the A), B), etc. prefixes
      const options = [
        card.back, // Correct answer without prefix
        wrongAnswers[0],
        wrongAnswers[1],
        wrongAnswers[2]
      ];
      
      return {
        question: card.front,
        options: options,
        correct: 'A' // Since we put the correct answer first
      };
    });
    
    // Use createQuiz to store the questions
    await createQuiz(studySetId, questions);
    
  } catch (error) {
    console.error('Failed to create quiz questions from flashcards:', error);
    throw error;
  }
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // First, remove folder_id from all study sets in this folder
    await db.runAsync(
      'UPDATE study_sets SET folder_id = NULL WHERE folder_id = ?',
      [folderId]
    );
    
    // Then delete the folder
    await db.runAsync(
      'DELETE FROM folders WHERE id = ?',
      [folderId]
    );
    
    console.log('Folder deleted successfully:', folderId);
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};

// Add this function to Database.ts
export const deleteStudySet = async (id: string): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Delete associated quiz questions and flashcards first (cascade delete)
    await db.runAsync('DELETE FROM quiz_questions WHERE study_set_id = ?', [id]);
    await db.runAsync('DELETE FROM flashcards WHERE study_set_id = ?', [id]);
    
    // Then delete the study set
    await db.runAsync('DELETE FROM study_sets WHERE id = ?', [id]);
    
    console.log('Study set deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting study set:', error);
    throw error;
  }
};

export const debugDatabase = async () => {
  try {
    const db = await getDatabase();
    console.log('Checking database contents...');
    
    const studySets = await db.getAllAsync('SELECT * FROM study_sets');
    console.log('Study sets in DB:', studySets);
    
    const folders = await db.getAllAsync('SELECT * FROM folders');
    console.log('Folders in DB:', folders);
    
  } catch (error) {
    console.error('Error debugging database:', error);
  }
};

export const debugDatabaseState = async () => {
  try {
    const db = await getDatabase();
    console.log('=== Database Debug Info ===');
    
    // Check tables
    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log('Tables:', tables);
    
    // Check study sets
    const studySets = await db.getAllAsync('SELECT * FROM study_sets');
    console.log('Study Sets:', studySets);
    
    // Check database connection
    const testQuery = await db.getFirstAsync('SELECT 1');
    console.log('Database connection test:', testQuery);
    
  } catch (error) {
    console.error('Database debug error:', error);
  }
};

