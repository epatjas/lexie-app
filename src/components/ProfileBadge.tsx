import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getActiveProfile } from '../utils/storage';
import theme from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileBadgeProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  profileData?: {
    name?: string;
    avatarId?: string;
  } | null;
}

const ProfileBadge: React.FC<ProfileBadgeProps> = ({ style, onPress, profileData }) => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    } else {
      loadProfileFromStorage();
    }
  }, [profileData]);
  
  const loadProfileFromStorage = async () => {
    try {
      const profile = await getActiveProfile();
      if (profile && profile.avatarId) {
        // Get the correct image based on the avatar ID
        const imageIndex = parseInt(profile.avatarId) - 1;
        const PROFILE_IMAGES = [
          require('../../assets/Account creation/profile 1.png'),
          require('../../assets/Account creation/profile 2.png'),
          require('../../assets/Account creation/profile 3.png'),
          require('../../assets/Account creation/profile 4.png'),
          require('../../assets/Account creation/profile 5.png'),
          require('../../assets/Account creation/profile 6.png'),
          require('../../assets/Account creation/profile 7.png'),
          require('../../assets/Account creation/profile 8.png'),
          require('../../assets/Account creation/profile 9.png')
        ];
        setProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };
  
  const handlePress = async () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Settings');
    }
    try {
      const profileId = await AsyncStorage.getItem('@active_profile');
      const profilesJson = await AsyncStorage.getItem('@user_profiles');
      console.log('Debug - Active profile ID:', profileId);
      console.log('Debug - All profiles:', profilesJson);
    } catch (error) {
      console.error('Error debugging profile:', error);
    }
  };
  
  const getProfileImage = (avatarId?: string) => {
    const PROFILE_IMAGES = {
      '1': require('../../assets/Account creation/profile 1.png'),
      '2': require('../../assets/Account creation/profile 2.png'),
      '3': require('../../assets/Account creation/profile 3.png'),
      '4': require('../../assets/Account creation/profile 4.png'),
      '5': require('../../assets/Account creation/profile 5.png'),
      '6': require('../../assets/Account creation/profile 6.png'),
      '7': require('../../assets/Account creation/profile 7.png'),
      '8': require('../../assets/Account creation/profile 8.png'),
      '9': require('../../assets/Account creation/profile 9.png')
    };
    
    // If we have a valid avatarId and it exists in our image map, return that image
    if (avatarId && PROFILE_IMAGES[avatarId]) {
      console.log(`Loading profile image for avatarId: ${avatarId}`);
      return PROFILE_IMAGES[avatarId];
    }
    
    // Default to first image if no valid avatarId
    console.log('Using default profile image (1)');
    return PROFILE_IMAGES['1'];
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: 40, height: 40 },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image 
        source={getProfileImage(profile?.avatarId)} 
        style={styles.image} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: theme.colors.background02,
  },
  image: {
    width: '100%',
    height: '100%',
  }
});

export default ProfileBadge; 