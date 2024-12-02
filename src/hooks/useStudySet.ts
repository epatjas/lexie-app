import { useState, useCallback, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getAllStudySets, getStudySet, deleteStudySet } from '../services/Database';

// For managing list of all study sets
export function useStudySets() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshStudySets = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedSets = await getAllStudySets();
      setStudySets(fetchedSets);
    } catch (error) {
      console.error('Error refreshing study sets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStudySets();
  }, [refreshStudySets]);

  return { studySets, loading, refreshStudySets };
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