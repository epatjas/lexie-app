import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugProfileStorage = async () => {
  try {
    // Check all profile-related storage keys
    const activeProfileId = await AsyncStorage.getItem('@active_profile');
    const activeProfileData = await AsyncStorage.getItem('@active_profile_data');
    const profiles = await AsyncStorage.getItem('@user_profiles');
    
    console.log('DEBUG PROFILE STORAGE:');
    console.log('Active Profile ID:', activeProfileId);
    console.log('Active Profile Data:', activeProfileData);
    console.log('All Profiles:', profiles);
    
    // Check all AsyncStorage keys to find any profile-related data
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('All AsyncStorage keys:', allKeys);
    
    return { activeProfileId, activeProfileData, profiles, allKeys };
  } catch (error) {
    console.error('Error debugging profile storage:', error);
    return null;
  }
}; 