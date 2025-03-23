import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion, Folder, HomeworkHelp, StudyMaterials, RawHomeworkHelp } from '../types/types';
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
    
    // Check if study_sets table exists
    const tableExists = await db.getFirstAsync<{count: number}>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='study_sets'"
    );
    
    if (!tableExists || tableExists.count === 0) {
      console.log('Study sets table does not exist yet, skipping schema verification');
      return;
    }
    
    // Check study_sets table structure
    const studySetsInfo = await db.getAllAsync<TableColumn>(
      "PRAGMA table_info('study_sets')"
    );
    
    const hasHomeworkHelp = studySetsInfo.some(column => column.name === 'homework_help');
    const hasContentType = studySetsInfo.some(column => column.name === 'content_type');
    const hasIntroduction = studySetsInfo.some(column => column.name === 'introduction');
    
    // Add homework_help column if missing
    if (!hasHomeworkHelp) {
      console.log('Adding homework_help column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN homework_help TEXT DEFAULT NULL;
      `);
      console.log('Added homework_help column successfully');
    }
    
    // Add content_type column if missing
    if (!hasContentType) {
      console.log('Adding content_type column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN content_type TEXT DEFAULT 'study-set';
      `);
      console.log('Added content_type column successfully');
    }
    
    // Add introduction column if missing
    if (!hasIntroduction) {
      console.log('Adding introduction column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN introduction TEXT DEFAULT '';
      `);
      console.log('Added introduction column successfully');
    }
  } catch (error) {
    console.error('Schema verification failed:', error);
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

// This function attaches custom methods to the database object
const attachDatabaseMethods = (database: SQLite.SQLiteDatabase) => {
  // Add the getStudySet method
  database.getStudySet = async (id: string): Promise<StudySet> => {
    const rawStudySet = await database.getFirstAsync<StudySet & { text_content: string }>(
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
    
    return studySet;
  };

  // Add the getHomeworkHelp method
  database.getHomeworkHelp = async (id: string): Promise<HomeworkHelp | null> => {
    const rawHelp = await database.getFirstAsync<{
      id: string;
      title: string;
      type: string;
      text_content: string;
      help_content: string;
      content_type: string;
      created_at: number | string;
      updated_at: number | string;
      profile_id: string;
    }>('SELECT * FROM homework_help WHERE id = ?', [id]);
    
    if (!rawHelp) return null;
    
    // Parse JSON strings back to objects
    return {
      id: rawHelp.id,
      title: rawHelp.title,
      contentType: 'homework-help' as const,
      text_content: JSON.parse(rawHelp.text_content),
      homeworkHelp: JSON.parse(rawHelp.help_content),
      created_at: rawHelp.created_at,
      updated_at: rawHelp.updated_at,
      profile_id: rawHelp.profile_id
    };
  };
};

// Update the getDatabase function to attach methods
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    // Make sure methods are attached even if using cached instance
    attachDatabaseMethods(db);
    return db;
  }
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    await initializationPromise;
    if (db) {
      attachDatabaseMethods(db);
      return db;
    }
  }

  // If no initialization is in progress, start a new one
  if (!isInitializing) {
    db = await SQLite.openDatabaseAsync('studysets.db');
    await initTables(db);
    attachDatabaseMethods(db); // Attach methods to the new instance
    return db;
  }

  throw new Error('Database initialization failed');
};

// Separate table initialization into its own function
const initTables = async (database: SQLite.SQLiteDatabase) => {
  try {
    console.log('Creating database tables if they don\'t exist...');
    
    // Create tables first
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        folder_id TEXT REFERENCES folders(id),
        text_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_id TEXT NOT NULL DEFAULT '',
        content_type TEXT DEFAULT 'study-set'
      );
      
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL REFERENCES study_sets(id),
        front TEXT NOT NULL,
        back TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL REFERENCES study_sets(id),
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS homework_help (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        text_content TEXT,
        help_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_id TEXT NOT NULL DEFAULT '',
        content_type TEXT DEFAULT 'homework-help'
      );
    `);
    
    console.log('Tables created successfully');
    
    // Now verify and update schema if needed
    await verifyAndUpdateSchema(database);
    
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
 * Retrieves a specific study set by ID, handling both content types.
 * @param id - The unique identifier of the content
 * @returns Promise<StudyMaterials> - The content if found
 */
export const getStudySet = async (id: string): Promise<StudyMaterials> => {
  try {
    const db = await getDatabase();
    console.log('Fetching content with id:', id);
    
    const rawContent = await db.getFirstAsync<any>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    
    if (!rawContent) {
      throw new Error(`Content with id ${id} not found`);
    }

    // Parse the text_content JSON string
    const textContent = JSON.parse(rawContent.text_content);
    
    // Handle content based on its type
    if (rawContent.content_type === 'homework-help') {
      // This is homework help content
      let homeworkHelp;
      
      try {
        // Try to parse homeworkHelp data if it exists
        homeworkHelp = rawContent.homework_help ? JSON.parse(rawContent.homework_help) : {};
      } catch (parseError) {
        console.error('Failed to parse homework help data:', parseError);
        homeworkHelp = {}; // Fallback
      }
      
      // Return properly typed HomeworkHelp content
      const content: HomeworkHelp = {
        id: rawContent.id,
        title: rawContent.title,
        contentType: 'homework-help' as const,
        text_content: textContent,
        homeworkHelp: homeworkHelp,
        created_at: rawContent.created_at,
        updated_at: rawContent.updated_at,
        profile_id: rawContent.profile_id,
        folder_id: rawContent.folder_id
      };
      
      return content;
    } else {
      // This is study set content
      // Get flashcards and quiz questions
      const flashcards = await db.getAllAsync<any>(
        'SELECT * FROM flashcards WHERE study_set_id = ?',
        [id]
      );
      
      const quizQuestions = await db.getAllAsync<any>(
        'SELECT * FROM quiz_questions WHERE study_set_id = ?',
        [id]
      );
      
      // Parse the options JSON for quiz questions
      const parsedQuizQuestions = quizQuestions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }));
      
      // Return properly typed StudySet content
      const content: StudySet = {
        id: rawContent.id,
        title: rawContent.title,
        contentType: 'study-set' as const,
        text_content: textContent,
        introduction: rawContent.introduction || '',
        summary: rawContent.summary || '',
        flashcards: flashcards || [],
        quiz: parsedQuizQuestions || [],
        created_at: rawContent.created_at,
        updated_at: rawContent.updated_at,
        profile_id: rawContent.profile_id,
        folder_id: rawContent.folder_id
      };
      
      return content;
    }
  } catch (error) {
    console.error('Failed to get content:', error);
    throw error;
  }
};

/**
 * Creates a new study set in the database.
 * @param input - The content data to insert (title, flashcards, etc.)
 * @returns Promise<StudyMaterials> - The created content with generated ID and timestamps
 */
export const createStudySet = async (input: any): Promise<StudyMaterials & { id: string }> => {
  try {
    const db = await getDatabase();
    console.log('=== Starting Content Creation ===');
    console.log('Content Type from input:', input.contentType);

    const now = Date.now();
    const id = uuidv4();
    console.log('Generated ID:', id);
    
    // SQL parameters array
    const sqlParams = [
      id, 
      input.title,
      input.introduction || '', 
      input.summary || '',
      JSON.stringify(input.text_content),
      input.contentType, // Always use the provided content type
      now,
      now,
      input.profile_id || ''
    ];
    
    // Insert into study_sets table
    await db.runAsync(`
      INSERT INTO study_sets (
        id, title, introduction, summary, text_content, content_type, created_at, updated_at, profile_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, sqlParams);
    
    console.log('Added base content record');

    // Handle specific content type data
    if (input.contentType === 'study-set') {
      // Create flashcards if they exist
      if (input.flashcards && input.flashcards.length > 0) {
        await createFlashcards(id, input.flashcards);
        console.log('Added flashcards');
      }

      // Create quiz questions if they exist
      if (input.quiz && input.quiz.length > 0) {
        const quizWithIds = input.quiz.map(q => ({
          id: uuidv4(),
          study_set_id: id,
          question: q.question,
          options: q.options,
          correct: q.correct
        }));
        
        await createQuiz(id, quizWithIds);
        console.log('Added quiz questions');
      }
    } else if (input.contentType === 'homework-help' && input.homeworkHelp) {
      // Add introduction if it's not explicitly included
      const introduction = input.introduction || 
        `I analyzed this ${input.homeworkHelp.subject_area || 'problem'}. Here's some help to guide you.`;
      
      await db.runAsync(`
        UPDATE study_sets 
        SET homework_help = ?, introduction = ?
        WHERE id = ?
      `, [JSON.stringify(input.homeworkHelp), introduction, id]);
      
      console.log('Added homework help data with introduction');
      console.log('Added homework help data with', 
        input.homeworkHelp.concept_cards ? 
        `${input.homeworkHelp.concept_cards.length} concept cards` : 
        'no concept cards');
    }

    // Get the complete content record
    const result = await getStudySet(id);
    console.log('Retrieved created content with type:', result.contentType);
    
    return {
      ...result,
      id
    };
  } catch (error) {
    console.error('Failed to create content:', error);
    throw error;
  }
}

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

// Add this near the top of your file
type DatabaseQuizQuestion = QuizQuestion & {
  id: string;
  study_set_id: string;
};

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
    
    if (!rawQuestions || rawQuestions.length === 0) {
      console.warn('No questions found for study set:', studySetId);
      return [];
    }
    
    // Parse the options JSON string into array with better error handling
    const questions: QuizQuestion[] = [];
    for (const q of rawQuestions) {
      try {
        let parsedOptions: string[];
        try {
          const parsed = JSON.parse(q.options);
          parsedOptions = Array.isArray(parsed) ? parsed : [q.options];
        } catch (parseError) {
          console.error('Failed to parse options for question:', q.id, parseError);
          parsedOptions = [q.options]; // Fallback
        }
        
        // Make sure this object structure includes ALL required properties
        const question: QuizQuestion = {
          id: q.id,
          study_set_id: q.study_set_id,
          question: q.question,
          options: parsedOptions,
          correct: q.correct
        };
        
        questions.push(question);
      } catch (questionError) {
        console.error('Error processing question:', q, questionError);
      }
    }
    
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
export const createQuiz = async (studySetId: string, questions: Partial<QuizQuestion>[]): Promise<void> => {
  try {
    if (!questions || questions.length === 0) {
      console.log('No quiz questions to create');
      return;
    }
    
    const db = await getDatabase();
    console.log('Creating quiz for study set:', studySetId);
    console.log('Questions to create:', questions.length);
    
    // First, clear existing questions
    await db.runAsync(
      'DELETE FROM quiz_questions WHERE study_set_id = ?',
      [studySetId]
    );
    
    // Insert each question
    for (const q of questions) {
      // Ensure we have all required fields
      if (!q.question || !q.options || !q.correct) {
        console.warn('Skipping invalid question:', q);
        continue;
      }
      
      // Clean up options if they have prefixes
      const cleanOptions = Array.isArray(q.options) 
        ? q.options.map(stripOptionPrefix)
        : [];
      
      console.log('Processing question:', {
        question: q.question,
        optionsCount: cleanOptions.length,
        correct: q.correct
      });
      
      const optionsString = JSON.stringify(cleanOptions);
      const questionId = q.id || uuidv4(); // Use existing ID or generate new one
      
      await db.runAsync(
        `INSERT INTO quiz_questions (id, study_set_id, question, options, correct) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          questionId,
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
    
    // Fix the array types by adding explicit type annotations
    const updateFields: string[] = [];
    const values: (string | number)[] = [];
    
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
      
      // Include ALL required properties for QuizQuestion
      return {
        id: uuidv4(), // Generate a unique ID
        study_set_id: studySetId,
        question: card.front,
        options: options,
        correct: card.back // The correct answer is the 'back' content
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

export const forceInitDatabase = async (): Promise<void> => {
  console.log('Force initializing database...');
  tablesInitialized = false;
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await initDatabase();
  
  // Verify tables were created
  const database = await getDatabase();
  const tables = await database.getAllAsync<{name: string}>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  console.log('Tables after initialization:', tables.map(t => t.name));
};

// Update saveHomeworkHelp to handle both old and new formats
export const saveHomeworkHelp = async (homeworkHelp: HomeworkHelp): Promise<string> => {
  try {
    const db = await getDatabase();
    console.log('=== Saving Homework Help ===');
    
    // Add this debug log to check problem_summary field
    if (homeworkHelp.homeworkHelp?.problem_summary) {
      console.log('Problem summary length:', 
        homeworkHelp.homeworkHelp.problem_summary.length,
        'First 100 chars:', 
        homeworkHelp.homeworkHelp.problem_summary.substring(0, 100)
      );
    }
    
    const now = Date.now();
    const id = uuidv4();
    
    // Convert objects to JSON strings for storage
    const textContent = JSON.stringify(homeworkHelp.text_content);
    const helpContent = JSON.stringify(homeworkHelp.homeworkHelp);
    
    // Determine content type
    const contentType = homeworkHelp.contentType || 'homework-help';
    
    // Determine 'type' field for categorization
    const typeField = 
      homeworkHelp.homeworkHelp.problem_type || 
      homeworkHelp.homeworkHelp.type || 
      homeworkHelp.homeworkHelp.subject_area || 
      (homeworkHelp.homeworkHelp.language === 'fi' ? 'Suomenkielinen' : 'English');
    
    await db.runAsync(
      `INSERT INTO homework_help (
        id, title, type, text_content, help_content, content_type, created_at, updated_at, profile_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        homeworkHelp.title, 
        typeField,
        textContent,
        helpContent,
        contentType,
        now, 
        now, 
        homeworkHelp.profile_id || ''
      ]
    );
    
    console.log('Homework help saved with ID:', id);
    console.log('Homework help fields:', {
      id,
      title: homeworkHelp.title,
      type: typeField,
      contentType,
      hasNewFormat: !!homeworkHelp.homeworkHelp.problem_summary,
      cardCount: homeworkHelp.homeworkHelp.concept_cards?.length || 0
    });
    
    return id;
  } catch (error) {
    console.error('Failed to save homework help:', error);
    throw error;
  }
};

// Fix the getHomeworkHelp method to handle new format
export const getHomeworkHelp = async (id: string): Promise<HomeworkHelp | null> => {
  try {
    const db = await getDatabase();
    console.log('Fetching homework help with ID:', id);
    
    // Add fields to query result type
    const rawHelp = await db.getFirstAsync<RawHomeworkHelp>(
      'SELECT * FROM homework_help WHERE id = ?', 
      [id]
    );
    
    if (!rawHelp) {
      console.log('No homework help found with ID:', id);
      return null;
    }
    
    // Parse JSON and create properly typed object
    try {
      const content: HomeworkHelp = {
        id: rawHelp.id,
        title: rawHelp.title,
        contentType: 'homework-help' as const,
        introduction: rawHelp.introduction || '',
        text_content: JSON.parse(rawHelp.text_content),
        homeworkHelp: JSON.parse(rawHelp.help_content),
        created_at: rawHelp.created_at,
        updated_at: rawHelp.updated_at,
        profile_id: rawHelp.profile_id,
        folder_id: rawHelp.folder_id,
        processingId: rawHelp.processing_id
      };
      
      // Log format type for debugging
      const isNewFormat = !!content.homeworkHelp.problem_summary;
      console.log('Homework help format:', isNewFormat ? 'NEW' : 'OLD', {
        hasCards: !!content.homeworkHelp.concept_cards,
        cardCount: content.homeworkHelp.concept_cards?.length || 0
      });
      
      return content;
    } catch (error) {
      console.error('Error parsing homework help data:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to get homework help:', error);
    throw error;
  }
};

// Fix the getAllHomeworkHelp method
export const getAllHomeworkHelp = async (profileId: string): Promise<HomeworkHelp[]> => {
  try {
    const db = await getDatabase();
    
    const results = await db.getAllAsync<RawHomeworkHelp>(
      'SELECT * FROM homework_help WHERE profile_id = ? ORDER BY created_at DESC',
      [profileId]
    );
    
    return results.map(item => ({
      id: item.id,
      title: item.title,
      contentType: 'homework-help' as const, // Fix with const assertion
      introduction: item.introduction || '',
      text_content: JSON.parse(item.text_content),
      homeworkHelp: JSON.parse(item.help_content),
      created_at: item.created_at,
      updated_at: item.updated_at,
      profile_id: item.profile_id,
      folder_id: item.folder_id,
      processingId: item.processing_id
    }));
  } catch (error) {
    console.error('Failed to get all homework help:', error);
    throw error;
  }
};

// Update the type declaration at the bottom of Database.ts
declare module 'expo-sqlite' {
  interface SQLiteDatabase {
    getStudySet(id: string): Promise<StudySet>;
    getHomeworkHelp(id: string): Promise<HomeworkHelp | null>; // Allow null return
    // Add other methods as needed
  }
}

// Add a function to detect what type of content we're saving and route it appropriately
export const saveContent = async (content: StudyMaterials | HomeworkHelp): Promise<string> => {
  try {
    console.log('Saving content with type:', content.contentType);
    
    if (content.contentType === 'homework-help') {
      // This is homework help, save it as such
      return await saveHomeworkHelp(content as HomeworkHelp);
    } else {
      // This is a study set, save it normally
      const studySet = await createStudySet(content as unknown as CreateStudySetInput);
      return studySet.id;
    }
  } catch (error) {
    console.error('Failed to save content:', error);
    throw error;
  }
};

// Add this function to fix existing records with wrong content type
export const fixRecordContentType = async (id: string): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // First, check if this looks like a homework help record
    const record = await db.getFirstAsync<{ text_content: string, id: string }>(
      'SELECT * FROM study_sets WHERE id = ?', 
      [id]
    );
    
    if (!record) {
      console.error('Record not found:', id);
      return;
    }
    
    // Check content to detect homework-help content
    try {
      const textContent = JSON.parse(record.text_content);
      
      // Patterns that suggest this is homework help
      const isLikelyHomework = 
        textContent.raw_text.includes('PiiX-alus') || // Your specific problem
        textContent.raw_text.includes('Mikä on PiiX-aluksen nopeus?') || 
        (textContent.sections && 
         textContent.sections.some(s => 
           s.type === 'list' && 
           s.items && 
           s.items.some(i => i.includes('PiiX-alus'))
         ));
      
      if (isLikelyHomework) {
        console.log('This appears to be homework help, updating content_type...');
        
        // Update the content_type to homework-help
        await db.runAsync(
          'UPDATE study_sets SET content_type = ? WHERE id = ?',
          ['homework-help', id]
        );
        
        console.log('Updated content type to homework-help for:', id);
      }
    } catch (e) {
      console.error('Error parsing record content:', e);
    }
  } catch (error) {
    console.error('Failed to fix record content type:', error);
  }
};

