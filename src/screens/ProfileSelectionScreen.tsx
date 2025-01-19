import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import theme from '../styles/theme';
import ParticleBackground from '../components/ParticleBackground';
import { getUserProfiles, setActiveProfile } from '../utils/storage';
import { Plus } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Profile } from '../types/types';

type ProfileSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileSelection'>;

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({ navigation }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const savedProfiles = await getUserProfiles();
      setProfiles(savedProfiles || []);
      
      if (!savedProfiles || savedProfiles.length === 0) {
        navigation.replace('Welcome');
        return;
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProfile = () => {
    navigation.navigate('NameInput');
  };

  const handleSelectProfile = async (profile: Profile) => {
    try {
      await setActiveProfile(profile.id);
      navigation.replace('Home');
    } catch (error) {
      console.error('Error selecting profile:', error);
    }
  };

  const getProfileImage = (avatarId: string): any => {
    const images: Record<string, any> = {
      '1': require('../../assets/Account creation/profile 1.png'),
      '2': require('../../assets/Account creation/profile 2.png'),
      '3': require('../../assets/Account creation/profile 3.png'),
      '4': require('../../assets/Account creation/profile 4.png'),
      '5': require('../../assets/Account creation/profile 5.png'),
      '6': require('../../assets/Account creation/profile 6.png'),
      '7': require('../../assets/Account creation/profile 7.png'),
      '8': require('../../assets/Account creation/profile 8.png'),
      '9': require('../../assets/Account creation/profile 9.png'),
    };
    return images[avatarId] || images['1']; // Fallback to first image if ID not found
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ParticleBackground />
        <View style={styles.content}>
          {/* You can add a loading indicator here if you want */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <View style={styles.content}>
        <Text style={styles.title}>Valitse profiili</Text>

        <View style={styles.profilesContainer}>
          {profiles.map(profile => (
            <TouchableOpacity
              key={profile.id}
              style={styles.profileItem}
              onPress={() => handleSelectProfile(profile)}
            >
              <Image 
                source={getProfileImage(profile.avatarId)}
                style={styles.profileImage}
              />
              <Text style={styles.profileName}>{profile.name}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addProfileButton}
            onPress={handleAddProfile}
          >
            <View style={styles.plusIconContainer}>
              <Plus size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
            <Text style={styles.addProfileText}>Lisää uusi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    marginTop: -140,
  },
  title: {
    fontSize: theme.fontSizes.xxl,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fonts.medium,
  },
  profilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  profileItem: {
    alignItems: 'center',
    width: 96,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 999,
    marginBottom: theme.spacing.sm,
  },
  profileName: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  plusIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  addProfileText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
  addProfileButton: {
    alignItems: 'center',
    width: 88,
  },
});

export default ProfileSelectionScreen; 