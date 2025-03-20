import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define Profile type
type Profile = {
  id: string;
  name: string;
  avatarId: string;
};

type ProfileContextType = {
  activeProfile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
};

// Create a default context value
const defaultContextValue: ProfileContextType = {
  activeProfile: null,
  refreshProfile: async () => {},
  updateProfile: async () => {},
};

const ProfileContext = createContext<ProfileContextType>(defaultContextValue);

export const ProfileProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get active profile directly
  const getActiveProfileFromStorage = async (): Promise<Profile | null> => {
    try {
      // First try to get the active profile ID
      const activeProfileId = await AsyncStorage.getItem('@active_profile');
      console.log('Active profile ID from storage:', activeProfileId);
      
      if (!activeProfileId) {
        console.log('No active profile ID found');
        return null;
      }
      
      // Get all profiles
      const profilesJson = await AsyncStorage.getItem('@user_profiles');
      console.log('Profiles from @user_profiles:', profilesJson ? JSON.parse(profilesJson).length : 0);
      
      if (!profilesJson) {
        console.log('No profiles found in @user_profiles');
        return null;
      }
      
      const profiles = JSON.parse(profilesJson);
      
      // Find profile with matching ID
      const matchingProfile = profiles.find((p: Profile) => p.id === activeProfileId);
      console.log('Found profile:', matchingProfile);
      
      return matchingProfile || null;
    } catch (error) {
      console.error('Error in getActiveProfileFromStorage:', error);
      return null;
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    try {
      console.log('Refreshing profile...');
      const profile = await getActiveProfileFromStorage();
      
      if (profile) {
        console.log('Setting active profile to:', profile);
        setActiveProfile(profile);
      } else {
        console.log('No profile found during refresh');
        setActiveProfile(null);
      }
    } catch (error) {
      console.error('Error in refreshProfile:', error);
    }
  };

  // Update profile function
  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    try {
      console.log('Updating profile with ID:', id);
      console.log('Updates:', updates);
      
      // Get current profiles
      const profilesJson = await AsyncStorage.getItem('@user_profiles');
      if (!profilesJson) {
        throw new Error('No profiles found');
      }
      
      const profiles = JSON.parse(profilesJson);
      
      // Update the matching profile
      const updatedProfiles = profiles.map((profile: Profile) => 
        profile.id === id ? { ...profile, ...updates } : profile
      );
      
      // Save updated profiles
      await AsyncStorage.setItem('@user_profiles', JSON.stringify(updatedProfiles));
      console.log('Saved updated profiles to storage');
      
      // If this is the active profile, update the state
      if (activeProfile && activeProfile.id === id) {
        const updatedProfile = { ...activeProfile, ...updates };
        console.log('Updating active profile state to:', updatedProfile);
        setActiveProfile(updatedProfile);
        
        // Also update @active_profile_data to help with immediate updates
        await AsyncStorage.setItem('@active_profile_data', JSON.stringify(updatedProfile));
      }
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      console.log('Initializing ProfileContext...');
      await refreshProfile();
      setIsInitialized(true);
    };
    
    initialize();
  }, []);

  const contextValue = {
    activeProfile,
    refreshProfile,
    updateProfile,
  };

  console.log('ProfileContext rendering with activeProfile:', 
    activeProfile ? `${activeProfile.name} (${activeProfile.id})` : 'null');

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext); 