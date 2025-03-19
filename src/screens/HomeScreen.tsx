import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
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
import { ChevronLeft, Book, Settings } from 'lucide-react-native';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<Array<{
    uri: string;
    base64?: string;
  }> | undefined>(undefined);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const progress = useSharedValue(0);

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

  useEffect(() => {
    const loadActiveProfile = async () => {
      try {
        const profile = await getActiveProfile();
        setActiveProfile(profile);
      } catch (error) {
        console.error('Error loading active profile:', error);
      }
    };

    loadActiveProfile();
  }, []);

  const handleStartLesson = () => {
    console.log('Start lesson button pressed');
    setIsBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetVisible(false);
    setExistingPhotos(undefined);
  };

  React.useEffect(() => {
    if (isBottomSheetVisible) {
      progress.value = withTiming(1, {
        duration: 300,
      });
    } else {
      progress.value = withTiming(0, {
        duration: 300,
      });
    }
  }, [isBottomSheetVisible]);

  const modalStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [1000, 0]
    );
    
    return {
      transform: [{ translateY }],
      backgroundColor: theme.colors.background02,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
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

  return (
    <Animated.View style={styles.container}>
      <ParticleBackground />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.lessonsButton}
          onPress={() => navigation.navigate('LessonHistory')}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
          <Text style={styles.lessonsButtonText}>Lessons</Text>
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setIsSettingsVisible(true)}
          >
            <Settings size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileSelection')}
          >
            <Image
              source={getProfileImage(activeProfile?.avatarId)}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>
            Hi 👋🏻 {activeProfile?.name}!
          </Text>
          <Text style={styles.questionText}>
            What do you want to{'\n'}learn today?
          </Text>
        </View>
      </View>

      <View style={styles.startButtonContainer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartLesson}
        >
          <Text style={styles.startButtonText}>
            Start a lesson with Lexie
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
          navigation={navigation}
          onClose={() => setIsSettingsVisible(false)}
          onProfileDeleted={() => {
            setIsSettingsVisible(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProfileSelection' }],
            });
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    position: 'absolute',
    top: 64,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  lessonsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonsButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background02,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.background02,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
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
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 50,
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
});
