import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Check, Trash2 } from 'lucide-react-native';
import theme from '../styles/theme';
import { deleteProfile } from '../utils/storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../i18n/LanguageContext';

type Profile = {
  id: string;
  name: string;
  avatarId: string;
};

const PROFILE_IMAGES = [
  { id: '1', source: require('../../assets/Account creation/profile 1.png') },
  { id: '2', source: require('../../assets/Account creation/profile 2.png') },
  { id: '3', source: require('../../assets/Account creation/profile 3.png') },
  { id: '4', source: require('../../assets/Account creation/profile 4.png') },
  { id: '5', source: require('../../assets/Account creation/profile 5.png') },
  { id: '6', source: require('../../assets/Account creation/profile 6.png') },
  { id: '7', source: require('../../assets/Account creation/profile 7.png') },
  { id: '8', source: require('../../assets/Account creation/profile 8.png') },
  { id: '9', source: require('../../assets/Account creation/profile 9.png') }
];

type ProfileSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileSettings'>;

export default function ProfileSettingsScreen({ navigation }: ProfileSettingsScreenProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        const profileId = await AsyncStorage.getItem('@active_profile');
        console.log('Direct access - Active profile ID:', profileId);
        
        if (!profileId) {
          throw new Error('No active profile ID found');
        }
        
        const profilesJson = await AsyncStorage.getItem('@user_profiles');
        console.log('Direct access - Profiles JSON:', profilesJson);
        
        if (!profilesJson) {
          throw new Error('No profiles found');
        }
        
        const profiles = JSON.parse(profilesJson) as Profile[];
        const activeProfile = profiles.find(p => p.id === profileId);
        
        console.log('Direct access - Found profile:', activeProfile);
        
        if (!activeProfile) {
          throw new Error('Profile not found');
        }
        
        setProfile(activeProfile);
        setName(activeProfile.name || '');
        setSelectedAvatar(activeProfile.avatarId || '1');
      } catch (error: any) {
        console.error('Error loading profile:', error.message);
        Alert.alert(t('alerts.error'), t('profileSettings.alerts.loadError'));
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [t]);

  const handleSave = async () => {
    if (!profile) {
      Alert.alert(t('alerts.error'), t('profileSettings.alerts.noProfile'));
      return;
    }
    
    setLoading(true);
    try {
      const profilesJson = await AsyncStorage.getItem('@user_profiles');
      
      if (!profilesJson) {
        throw new Error('No profiles found');
      }
      
      const profiles = JSON.parse(profilesJson) as Profile[];
      
      const updatedProfiles = profiles.map(p => 
        p.id === profile.id 
          ? { ...p, name: name.trim(), avatarId: selectedAvatar }
          : p
      );
      
      await AsyncStorage.setItem('@user_profiles', JSON.stringify(updatedProfiles));
      console.log('Direct save - Updated profiles:', updatedProfiles);
      
      if (profile.id === await AsyncStorage.getItem('@active_profile')) {
        const updatedProfile = { ...profile, name: name.trim(), avatarId: selectedAvatar };
        await AsyncStorage.setItem('@active_profile_data', JSON.stringify(updatedProfile));
      }
      
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving profile:', error.message);
      Alert.alert(t('alerts.error'), t('profileSettings.alerts.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;

    Alert.alert(
      t('settings.deleteProfile.title'),
      t('settings.deleteProfile.message'),
      [
        {
          text: t('settings.deleteProfile.cancel'),
          style: "cancel"
        },
        {
          text: t('settings.deleteProfile.confirm'),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfile(profile.id);
              navigation.reset({
                index: 0,
                routes: [{ name: 'ProfileSelection' }],
              });
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert(t('alerts.error'), t('settings.deleteProfile.error'));
            }
          }
        }
      ]
    );
  };

  const renderAvatarItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.avatarContainer,
        selectedAvatar === item.id && styles.selectedAvatarContainer
      ]}
      onPress={() => setSelectedAvatar(item.id)}
    >
      <Image source={item.source} style={styles.avatarImage} />
      {selectedAvatar === item.id && (
        <View style={styles.checkIcon}>
          <Check size={16} color="black" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profileSettings.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('profileSettings.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profileSettings.title')}</Text>
        <TouchableOpacity 
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>{t('profileSettings.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{t('profileSettings.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('profileSettings.namePlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.5)"
        />

        <View style={styles.avatarGrid}>
          <FlatList
            data={PROFILE_IMAGES}
            renderItem={renderAvatarItem}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
          />
        </View>

        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteProfile}
        >
          <Trash2 size={20} color="#FF6B6B" style={{marginRight: 8}} />
          <Text style={styles.deleteButtonText}>{t('profileSettings.deleteProfile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  avatarGrid: {
    flex: 1,
  },
  gridContainer: {
    paddingBottom: 16,
  },
  avatarContainer: {
    margin: 8,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'visible',
    position: 'relative',
  },
  selectedAvatarContainer: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  checkIcon: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 24,
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
  },
}); 