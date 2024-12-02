import { useState, useCallback, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getCompleteStudySet } from '../services/Database';

export function useStudySetDetails(id: string) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStudySet = useCallback(async () => {
    try {
      setLoading(true);
      const set = await getCompleteStudySet(id);
      setStudySet(set);
    } catch (error) {
      console.error('Error refreshing study set:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    refreshStudySet();
  }, [refreshStudySet]);

  return { studySet, loading, refreshStudySet };
} 