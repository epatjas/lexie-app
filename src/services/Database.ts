import * as SQLite from 'expo-sqlite';
import { CreateStudySetInput, StudySet, Flashcard, QuizQuestion } from '../types/types';

// Add a singleton database connection
let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    console.log('Attempting to get database connection...');
    if (db === null) {
      console.log('Opening new database connection...');
      db = await SQLite.openDatabaseAsync('studysets.db');
      console.log('Database connection successful:', db);
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
    return db;
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
};

export const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS study_sets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        study_set_id TEXT NOT NULL,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        FOREIGN KEY (study_set_id) REFERENCES study_sets (id) ON DELETE CASCADE
      );
    `);
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export const getStudySet = async (id: string): Promise<StudySet | null> => {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<StudySet>(
      'SELECT * FROM study_sets WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Failed to get study set:', error);
    throw error;
  }
};

export const createStudySet = async (input: CreateStudySetInput): Promise<StudySet> => {
  try {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    await db.runAsync(
      'INSERT INTO study_sets (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, input.title, input.description, timestamp, timestamp]
    );
    
    return {
      id,
      title: input.title,
      description: input.description,
      created_at: timestamp,
      updated_at: timestamp
    };
  } catch (error) {
    console.error('Failed to create study set:', error);
    throw error;
  }
};

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
