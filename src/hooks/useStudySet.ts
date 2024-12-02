import { useState, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getCompleteStudySet, getAllStudySets, getDatabase } from '../services/Database';

// For getting a single study set
export function useStudySet(id: string) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);

  useEffect(() => {
    const loadStudySet = async () => {
      try {
        const set = await getCompleteStudySet(id);
        setStudySet(set);
      } catch (error) {
        console.error('Error loading study set:', error);
      }
    };

    loadStudySet();
  }, [id]);

  const refreshStudySet = async () => {
    try {
      const set = await getCompleteStudySet(id);
      setStudySet(set);
    } catch (error) {
      console.error('Error refreshing study set:', error);
    }
  };

  return { studySet, refreshStudySet };
}

// For getting all study sets
export function useStudySets() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudySets = async () => {
    try {
      const db = await getDatabase();
      const sets = await db.getAllAsync<StudySet>(
        'SELECT id, title, created_at, updated_at, folder_id FROM study_sets ORDER BY created_at DESC'
      );
      setStudySets(sets);
    } catch (error) {
      console.error('Error loading study sets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudySets();
  }, []);

  return { studySets, loading, refreshStudySets: loadStudySets };
} 