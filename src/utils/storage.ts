import AsyncStorage from '@react-native-async-storage/async-storage';

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