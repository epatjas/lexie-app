import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion, Folder, HomeworkHelp, StudyMaterials, RawHomeworkHelp, ChatSession, MessageRole, ChatMessage } from '../types/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// =====================================
// Types and Interfaces
// =====================================
interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

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

interface RawQuizQuestion {
  id: string;
  study_set_id: string;
  question: string;
  options: string; // JSON string in database
  correct: string;
}

// =====================================
// Database Configuration
// =====================================
let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let tablesInitialized = false;
const DB_VERSION = 3;

// =====================================
// Database Initialization Functions
// =====================================

/**
 * Initializes the database and creates necessary tables
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

/**
 * Verifies and updates the database schema if needed
 */
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
    const hasSummary = studySetsInfo.some(column => column.name === 'summary');
    const hasSubjectArea = studySetsInfo.some(column => column.name === 'subject_area');
    
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
    
    // Add summary column if missing
    if (!hasSummary) {
      console.log('Adding summary column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN summary TEXT DEFAULT '';
      `);
      console.log('Added summary column successfully');
    }
    
    // Add subject_area column if missing
    if (!hasSubjectArea) {
      console.log('Adding subject_area column to study_sets table...');
      await db.execAsync(`
        ALTER TABLE study_sets
        ADD COLUMN subject_area TEXT DEFAULT 'GENERAL';
      `);
      console.log('Added subject_area column successfully');
    }
    
    // ===== NEW CODE: Check quiz_questions table structure =====
    // Check if quiz_questions table exists
    const quizTableExists = await db.getFirstAsync<{count: number}>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='quiz_questions'"
    );
    
    if (quizTableExists && quizTableExists.count > 0) {
      // Check quiz_questions table structure
      const quizQuestionsInfo = await db.getAllAsync<TableColumn>(
        "PRAGMA table_info('quiz_questions')"
      );
      
      const hasExplanation = quizQuestionsInfo.some(column => column.name === 'explanation');
      
      // Add explanation column if missing
      if (!hasExplanation) {
        console.log('Adding explanation column to quiz_questions table...');
        await db.execAsync(`
          ALTER TABLE quiz_questions
          ADD COLUMN explanation TEXT DEFAULT '';
        `);
        console.log('Added explanation column successfully');
      }
    }
    // ===== END NEW CODE =====
    
  } catch (error) {
    console.error('Schema verification failed:', error);
  }
};

/**
 * Creates all necessary database tables
 */
const initTables = async (database: SQLite.SQLiteDatabase) => {
  try {
    console.log('Creating database tables if they don\'t exist...');
    
    // Create existing tables first
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
        content_type TEXT DEFAULT 'study-set',
        summary TEXT,
        subject_area TEXT DEFAULT 'GENERAL'
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
        correct TEXT NOT NULL,
        explanation TEXT
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
    
    // Create chat tables separately (without comment lines in SQL)
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_id TEXT NOT NULL DEFAULT ''
      );
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

// =====================================
// Study Set Operations
// =====================================

/**
 * Creates a new study set with optional flashcards and quiz questions
 */
export const createStudySet = async (input: any): Promise<StudyMaterials> => {
  try {
    const db = await getDatabase();
    console.log('=== Starting Content Creation ===');
    console.log('Content Type from input:', input.contentType);

    const now = Date.now();
    const id = uuidv4();
    console.log('Generated ID:', id);
    
    // Check if the subject_area column exists before attempting to insert
    try {
      const columns = await db.getAllAsync<TableColumn>("PRAGMA table_info('study_sets')");
      const hasSubjectArea = columns.some(col => col.name === 'subject_area');
      
      if (hasSubjectArea) {
        // SQL parameters array with subject_area
        const sqlParams = [
          id, 
          input.title,
          input.introduction || '', 
          input.summary || '',
          JSON.stringify(input.text_content),
          input.contentType,
          input.subject_area || 'GENERAL',
          now,
          now,
          input.profile_id || ''
        ];
        
        // Insert into study_sets table with subject_area
        await db.runAsync(`
          INSERT INTO study_sets (
            id, title, introduction, summary, text_content, content_type, subject_area, created_at, updated_at, profile_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, sqlParams);
      } else {
        // SQL parameters array without subject_area
        const sqlParams = [
          id, 
          input.title,
          input.introduction || '', 
          input.summary || '',
          JSON.stringify(input.text_content),
          input.contentType,
          now,
          now,
          input.profile_id || ''
        ];
        
        // Insert into study_sets table without subject_area
        await db.runAsync(`
          INSERT INTO study_sets (
            id, title, introduction, summary, text_content, content_type, created_at, updated_at, profile_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, sqlParams);
        
        // Try to add the column for future use
        try {
          await db.execAsync(`ALTER TABLE study_sets ADD COLUMN subject_area TEXT DEFAULT 'GENERAL';`);
          console.log('Added missing subject_area column on the fly');
        } catch (alterError) {
          console.warn('Could not add subject_area column:', alterError);
        }
      }
    } catch (error) {
      console.error('Failed to check or create schema:', error);
      throw error;
    }
    
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
    
    return result;
  } catch (error) {
    console.error('Failed to create content:', error);
    throw error;
  }
}

/**
 * Retrieves a study set by ID
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
 * Gets all study sets for a profile
 */
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

/**
 * Deletes a study set and its associated content
 */
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

// =====================================
// Homework Help Operations
// =====================================

/**
 * Saves homework help content to the database
 */
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

/**
 * Retrieves homework help by ID
 */
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

/**
 * Gets all homework help for a profile
 */
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

// =====================================
// Flashcard Operations
// =====================================

/**
 * Creates flashcards for a study set
 */
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

/**
 * Gets flashcards for a study set
 */
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

// =====================================
// Quiz Operations
// =====================================

/**
 * Creates quiz questions for a study set
 */
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
    
    // Check if the explanation column exists
    const quizQuestionsInfo = await db.getAllAsync<TableColumn>(
      "PRAGMA table_info('quiz_questions')"
    );
    const hasExplanation = quizQuestionsInfo.some(column => column.name === 'explanation');
    
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
      
      if (hasExplanation) {
        // Insert with explanation column
        await db.runAsync(
          `INSERT INTO quiz_questions (id, study_set_id, question, options, correct, explanation) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            studySetId,
            q.question,
            optionsString,
            q.correct,
            q.explanation || ''
          ]
        );
      } else {
        // Insert without explanation column
        console.log('Explanation column missing, inserting without it');
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
        
        // Try to add the column for future use
        try {
          await db.execAsync(`ALTER TABLE quiz_questions ADD COLUMN explanation TEXT DEFAULT '';`);
          console.log('Added missing explanation column on the fly');
        } catch (alterError) {
          console.warn('Could not add explanation column:', alterError);
        }
      }
    }
    
    console.log('Quiz created successfully');
  } catch (error) {
    console.error('Failed to create quiz:', error);
    throw error;
  }
};

/**
 * Gets quiz questions for a study set
 */
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

// =====================================
// Folder Operations
// =====================================

/**
 * Creates a new folder
 */
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

// ... other folder operations ...

// =====================================
// Chat Operations
// =====================================

/**
 * Creates a new chat session
 */
export const createChatSession = async (
  contentId: string, 
  contentType: 'study-set' | 'homework-help',
  title: string,
  profileId: string = ''
): Promise<ChatSession> => {
  try {
    const db = await getDatabase();
    const id = uuidv4();
    const now = Date.now();
    
    await db.runAsync(
      `INSERT INTO chat_sessions (id, content_id, content_type, title, created_at, updated_at, profile_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, contentId, contentType, title, now, now, profileId]
    );
    
    return {
      id,
      content_id: contentId,
      content_type: contentType,
      title,
      created_at: now,
      updated_at: now,
      profile_id: profileId
    };
  } catch (error) {
    console.error('Failed to create chat session:', error);
    throw error;
  }
};

/**
 * Retrieves all messages for a specific chat session
 */
export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const db = await getDatabase();
    const messages = await db.getAllAsync<ChatMessage>(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );
    return messages;
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    throw error;
  }
};

// =====================================
// Utility Functions
// =====================================

/**
 * Strips option prefix (A), B), etc.) from quiz options
 */
const stripOptionPrefix = (option: string): string => {
  // Remove only the letter prefix formats: "A) ", "A. ", "A ", etc.
  return option.replace(/^[A-D][\.\)]\s*/, '');
};

/**
 * Attaches custom methods to the database instance
 */
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

/**
 * Gets database instance, creating it if necessary
 */
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

/**
 * Closes the database connection
 */
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

// =====================================
// Debug Functions
// =====================================

/**
 * Debug function to test database connection
 */
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

// ... other debug functions ...

// =====================================
// Type Declarations
// =====================================
declare module 'expo-sqlite' {
    interface SQLiteDatabase {
        getStudySet(id: string): Promise<StudySet>;
        getHomeworkHelp(id: string): Promise<HomeworkHelp | null>;
    }
}

export const clearDatabase = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    // Drop all tables in the correct order (due to foreign key constraints)
    await db.execAsync('DROP TABLE IF EXISTS quiz_questions;');
    await db.execAsync('DROP TABLE IF EXISTS flashcards;');
    await db.execAsync('DROP TABLE IF EXISTS study_sets;');
    await db.execAsync('DROP TABLE IF EXISTS folders;');
    await db.execAsync('DROP TABLE IF EXISTS chat_sessions;');
    await db.execAsync('DROP TABLE IF EXISTS chat_messages;');
    
    // Reinitialize the database with fresh tables
    await initDatabase();
    
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Failed to clear database:', error);
    throw error;
  }
};

