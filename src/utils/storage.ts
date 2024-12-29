import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  HAS_SEEN_WELCOME: '@lexie_has_seen_welcome',
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