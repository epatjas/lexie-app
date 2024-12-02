import { useState, useCallback, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getAllStudySets } from '../services/Database';

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

  // Initial load
  useEffect(() => {
    refreshStudySets();
  }, [refreshStudySets]);

  return {
    studySets,
    loading,
    refreshStudySets,
  };
} 