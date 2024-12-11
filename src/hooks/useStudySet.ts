import { useState, useCallback, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getAllStudySets, getStudySet, deleteStudySet } from '../services/Database';
import { getDatabase } from '../services/Database';

// For managing list of all study sets
export function useStudySets() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshStudySets = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const sets = await db.getAllAsync<StudySet>(`
        SELECT id, title, text_content, folder_id, created_at, updated_at 
        FROM study_sets 
        ORDER BY created_at DESC
      `);
      console.log('Fetched study sets:', sets);
      setStudySets(sets);
    } catch (error) {
      console.error('Failed to refresh study sets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStudySets();
  }, [refreshStudySets]);

  return { studySets, refreshStudySets, loading };
}

// For managing single study set details
export function useStudySetDetails(id: string | undefined) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudySet = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getStudySet(id);
      setStudySet(data);
    } catch (error) {
      console.error('Error fetching study set:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudySet = async (studySetId: string) => {
    try {
      await deleteStudySet(studySetId);
    } catch (error) {
      console.error('Error deleting study set:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchStudySet();
  }, [id]);

  return {
    studySet,
    loading,
    refreshStudySet: fetchStudySet,
    deleteStudySet: handleDeleteStudySet,
  };
} 