import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { Profile } from '../types/types';
import CreateStudySetBottomSheet from '../components/CreateStudySetBottomSheet';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import ParticleBackground from '../components/ParticleBackground';
import { getActiveProfile } from '../utils/storage';
import SettingsScreen from './SettingsScreen';
import { ChevronLeft, ChevronRight, Book, Settings, FileText, Sparkles, LogOut, UserCog } from 'lucide-react-native';
import ProfileBadge from '../components/ProfileBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../i18n/LanguageContext';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useTranslation();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<Array<{
    uri: string;
    base64?: string;
  }> | undefined>(undefined);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const progress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...StyleSheet.absoluteFillObject,
  }));

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused - checking params');
      
      const params = navigation.getState().routes.find(
        route => route.name === 'Home'
      )?.params as { 
        refresh?: boolean; 
        openBottomSheet?: boolean;
        existingPhotos?: Array<{ uri: string; base64?: string; }>;
      } | undefined;
      
      if (params) {
        console.log('Route params:', {
          openBottomSheet: params.openBottomSheet,
          hasExistingPhotos: !!params.existingPhotos
        });
        
        if (params.openBottomSheet) {
          console.log('Setting bottom sheet visible to true');
          setIsBottomSheetVisible(true);
          if (params.existingPhotos) {
            setExistingPhotos(params.existingPhotos);
          }
        }

        setTimeout(() => {
          navigation.setParams({
            refresh: undefined,
            openBottomSheet: undefined,
            existingPhotos: undefined
          });
        }, 100);
      }
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true; // Flag to prevent setting state if component is unmounted
      
      console.log("HomeScreen got focus - refreshing profile");
      const loadProfile = async () => {
        try {
          const profileId = await AsyncStorage.getItem('@active_profile');
          console.log('Retrieved profile ID:', profileId);
          
          if (!isActive) return; // Check if component is still mounted
          
          if (profileId) {
            const profileDataJson = await AsyncStorage.getItem('@active_profile_data');
            console.log('Profile data from @active_profile_data:', profileDataJson);
            
            if (profileDataJson && isActive) {
              const profileData = JSON.parse(profileDataJson);
              console.log('Setting active profile to:', profileData);
              setActiveProfile(profileData);
              return;
            }
            
            // Only try this if we haven't set the profile yet
            const profilesJson = await AsyncStorage.getItem('@user_profiles');
            if (profilesJson && isActive) {
              const profiles = JSON.parse(profilesJson);
              const profile = profiles.find(p => p.id === profileId);
              if (profile) {
                console.log('Setting active profile from user_profiles:', profile);
                setActiveProfile(profile);
                // Also update active_profile_data for consistency
                await AsyncStorage.setItem('@active_profile_data', JSON.stringify(profile));
              }
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      };
      
      loadProfile();
      
      return () => {
        isActive = false; // Cleanup to prevent setting state after unmount
      };
    }, [])
  );

  const handleStartLesson = () => {
    console.log('Start lesson button pressed');
    setIsBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetVisible(false);
    setExistingPhotos(undefined);
  };

  const handleCloseSettings = () => {
    setIsSettingsVisible(false);
  };

  React.useEffect(() => {
    console.log('useEffect triggered, isSettingsVisible:', isSettingsVisible);
    
    if (isBottomSheetVisible || isSettingsVisible) {
      console.log('Setting progress value to 1');
      progress.value = withTiming(1, {
        duration: 300,
      });
    } else {
      console.log('Setting progress value to 0');
      progress.value = withTiming(0, {
        duration: 300,
      });
    }
  }, [isBottomSheetVisible, isSettingsVisible]);

  const modalStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [1000, 0]
    );
    
    return {
      transform: [{ translateY }],
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '90%',
    };
  });

  const getProfileImage = (avatarId: string | undefined): any => {
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
    return images[avatarId || '1'];
  };

  console.log('HomeScreen render, isSettingsVisible:', isSettingsVisible);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ParticleBackground />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            console.log('Navigating to Lesson History');
            navigation.navigate('LessonHistory');
          }}
        >
          <ChevronLeft color={theme.colors.text} size={20} />
          <Text style={styles.backButtonText}>{t('home.lessons')}</Text>
        </TouchableOpacity>

        <ProfileBadge 
          style={styles.profileBadge}
          profileData={activeProfile}
          onPress={() => {
            console.log('Profile badge clicked');
            setIsSettingsVisible(prevState => {
              console.log('Previous state:', prevState);
              return true;
            });
          }}
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>
            {t('home.greeting')} {activeProfile?.name}!
          </Text>
          <Text style={styles.questionText}>
            {t('home.questionPrompt')}
          </Text>
        </View>
      </View>

      <View style={styles.startButtonContainer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartLesson}
        >
          <Text style={styles.startButtonText}>
            {t('home.startLesson')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseBottomSheet}
      >
        <Animated.View style={overlayStyle}>
          <SafeAreaView style={styles.modalContainer}>
            <Animated.View style={modalStyle}>
              <CreateStudySetBottomSheet 
                onClose={handleCloseBottomSheet} 
                existingPhotos={existingPhotos}
                visible={isBottomSheetVisible}
              />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {isSettingsVisible && (
        <SettingsScreen 
          visible={isSettingsVisible}
          navigation={navigation}
          onClose={() => {
            console.log('Settings closed');
            setIsSettingsVisible(false);
          }}
          onProfileDeleted={() => {
            setIsSettingsVisible(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProfileSelection' }],
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  backButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: 4,
  },
  profileBadge: {
    // Any additional styling you want for the badge in this specific context
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  textContainer: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 24,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    paddingBottom: 0,
    marginTop: 0,
  },
  startButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  settingsBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  settingsTitle: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  settingsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background02,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  optionIcon: {
    width: 24,
    height: 24,
    marginRight: theme.spacing.md,
  },
  optionIconImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  settingsFooter: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
  },
  footerText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  indicatorBar: {
    width: 80,
    height: 4,
    backgroundColor: theme.colors.text,
    borderRadius: 2,
    marginTop: theme.spacing.lg,
  },
});
