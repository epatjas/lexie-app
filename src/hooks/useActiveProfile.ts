import { useState, useEffect } from 'react';
import { Profile } from '../types/types';
import { getActiveProfile } from '../utils/storage';

export const useActiveProfile = () => {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const profile = await getActiveProfile();
      setActiveProfile(profile);
    } catch (error) {
      console.error('Error loading active profile:', error);
      setActiveProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return [activeProfile, refreshProfile, loading] as const;
}; 