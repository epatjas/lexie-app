import { useState, useCallback, useEffect } from 'react';
import { StudySet, HomeworkHelp } from '../types/types';
import { getAllStudySets, getStudySet, deleteStudySet } from '../services/Database';
import { getDatabase } from '../services/Database';
import { useActiveProfile } from './useActiveProfile';

// For managing list of all study sets
export function useStudySets() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfile] = useActiveProfile();

  const refreshStudySets = useCallback(async () => {
    try {
      setLoading(true);
      if (!activeProfile?.id) {
        console.log('No active profile, skipping study sets fetch');
        setStudySets([]);
        return;
      }
      const results = await getAllStudySets(activeProfile.id);
      console.log('Raw study sets data:', JSON.stringify(results));
      setStudySets(results);
    } catch (error) {
      console.error('Error fetching study sets:', error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    refreshStudySets();
  }, [refreshStudySets]);

  return { studySets, refreshStudySets, loading };
}

// For managing single study set details
export function useStudySetDetails(id: string | undefined) {
  const [studySet, setStudySet] = useState<StudySet | HomeworkHelp | null>(null);
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