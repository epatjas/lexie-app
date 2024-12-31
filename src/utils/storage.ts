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
    await AsyncStorage.setItem('@active_profile', profileId);
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