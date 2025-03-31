import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types/types';
import { getDatabase } from '../services/Database';

const STORAGE_KEYS = {
  HAS_SEEN_WELCOME: '@lexie_has_seen_welcome',
  USER_NAME: '@lexie_user_name',
};

export const checkFirstTimeUser = async (): Promise<boolean> => {
  try {
    const hasSeenWelcome = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME);
    return hasSeenWelcome === null;
  } catch (error) {
    console.error('Error checking first time user:', error);
    return false;
  }
};

export const markWelcomeAsSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_WELCOME, 'true');
  } catch (error) {
    console.error('Error marking welcome as seen:', error);
  }
};

export const getUserName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  } catch (error) {
    console.error('Error getting user name:', error);
    return null;
  }
};

export const saveUserName = async (name: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    await markWelcomeAsSeen();
  } catch (error) {
    console.error('Error saving user name:', error);
  }
};

export const saveUserAvatar = async (avatarId: string) => {
  try {
    await AsyncStorage.setItem('@user_avatar', avatarId);
  } catch (error) {
    console.error('Error saving user avatar:', error);
    throw error;
  }
};

export const getUserAvatar = async () => {
  try {
    return await AsyncStorage.getItem('@user_avatar');
  } catch (error) {
    console.error('Error getting user avatar:', error);
    return null;
  }
};

export const resetStorage = async () => {
  try {
    // Clear all AsyncStorage items
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.HAS_SEEN_WELCOME,
      STORAGE_KEYS.USER_NAME,
      '@user_avatar',
      '@user_profiles',
      '@active_profile'
    ]);

    // Clear database tables
    const db = await getDatabase();
    await db.execAsync('DELETE FROM study_sets');
    await db.execAsync('DELETE FROM flashcards');
    await db.execAsync('DELETE FROM quiz_questions');
    await db.execAsync('DELETE FROM folders');

    console.log('Storage and database reset successful');
  } catch (error) {
    console.error('Error resetting storage:', error);
  }
};

export const saveUserProfile = async (name: string, avatarId: string) => {
  try {
    const profiles = await getUserProfiles();
    const newProfile = {
      id: Date.now().toString(),
      name,
      avatarId,
    };
    
    await AsyncStorage.setItem(
      '@user_profiles',
      JSON.stringify([...(profiles || []), newProfile])
    );
    
    return newProfile;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const getUserProfiles = async (): Promise<Profile[]> => {
  try {
    const profiles = await AsyncStorage.getItem('@user_profiles');
    return profiles ? JSON.parse(profiles) : [];
  } catch (error) {
    console.error('Error getting user profiles:', error);
    return [];
  }
};

export const setActiveProfile = async (profileId: string) => {
  try {
    // Set the active profile ID
    await AsyncStorage.setItem('@active_profile', profileId);
    
    // Get the full profile data from user_profiles
    const profilesJson = await AsyncStorage.getItem('@user_profiles');
    if (profilesJson) {
      const profiles = JSON.parse(profilesJson);
      const selectedProfile = profiles.find(p => p.id === profileId);
      
      if (selectedProfile) {
        // Store the full profile data in active_profile_data
        await AsyncStorage.setItem('@active_profile_data', JSON.stringify(selectedProfile));
        console.log('Profile switch complete:', {
          id: profileId,
          profile: selectedProfile
        });
      }
    }
  } catch (error) {
    console.error('Error setting active profile:', error);
    throw error;
  }
};

export const getActiveProfile = async (): Promise<Profile | null> => {
  try {
    const activeProfileId = await AsyncStorage.getItem('@active_profile');
    if (!activeProfileId) return null;
    
    const profiles = await getUserProfiles();
    return profiles.find(p => p.id === activeProfileId) || null;
  } catch (error) {
    console.error('Error getting active profile:', error);
    return null;
  }
};

export const deleteProfile = async (profileId: string) => {
  try {
    // Get current profiles
    const profiles = await getUserProfiles();
    
    // Filter out the profile to delete
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    
    // Save updated profiles list - Fix: use correct storage key
    await AsyncStorage.setItem('@user_profiles', JSON.stringify(updatedProfiles));
    
    // Clear active profile if it was the deleted one
    const activeProfile = await getActiveProfile();
    if (activeProfile?.id === profileId) {
      await AsyncStorage.removeItem('@active_profile');
    }

    console.log('Profile deleted from storage:', profileId);
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileId: string, updates: { name?: string; avatarId?: string }) => {
  try {
    console.log('Starting profile update for ID:', profileId);
    
    // Get existing profiles - Fix: use correct storage key '@user_profiles'
    const profilesJson = await AsyncStorage.getItem('@user_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : [];
    console.log('Current profiles:', profiles);
    
    // Find and update the profile
    const updatedProfiles = profiles.map(profile => {
      if (profile.id === profileId) {
        console.log('Updating profile:', { ...profile, ...updates });
        return { ...profile, ...updates };
      }
      return profile;
    });
    
    // Save updated profiles - Fix: use correct storage key '@user_profiles'
    await AsyncStorage.setItem('@user_profiles', JSON.stringify(updatedProfiles));
    
    // Update active profile if it's the current one - Fix: use correct storage key '@active_profile'
    const activeProfileId = await AsyncStorage.getItem('@active_profile');
    if (activeProfileId === profileId) {
      console.log('Updating active profile');
      const updatedProfile = updatedProfiles.find(p => p.id === profileId);
      if (updatedProfile) {
        await AsyncStorage.setItem('@active_profile', profileId);
      }
    }
    
    console.log('Profile update completed');
    return true;
  } catch (error) {
    console.error('Error in updateProfile:', error);
    throw error;
  }
}; 