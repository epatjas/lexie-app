import { useState, useEffect } from 'react';
import { StudySet } from '../types/types';
import { getStudySet } from '../services/Database';

export function useStudySet(id: string) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);

  useEffect(() => {
    const loadStudySet = async () => {
      try {
        console.log('Loading study set with id:', id);
        const data = await getStudySet(id);
        console.log('Loaded study set data:', data);
        setStudySet(data);
      } catch (error) {
        console.error('Error loading study set:', error);
      }
    };

    loadStudySet();
  }, [id]);

  return studySet;
} 