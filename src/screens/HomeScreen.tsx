import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { StudySet, Folder, Profile } from '../types/types';
import StudySetItem from '../components/StudySetItem';
import { useFolders } from '../hooks/useFolders';
import { useStudySets } from '../hooks/useStudySet';
import FolderCard from '../components/FolderCard';
import { Folder as FolderIcon, Hexagon } from 'lucide-react-native';
import CreateStudySetBottomSheet from '../components/CreateStudySetBottomSheet';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import ParticleBackground from '../components/ParticleBackground';
import { getActiveProfile } from '../utils/storage';
import SettingsScreen from './SettingsScreen';
import { BlurView } from 'expo-blur';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type ViewMode = 'all' | 'folders';
type ListItem = StudySet | (Folder & { study_set_count?: number });

const DEBUG = false;

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

// First, create a separate component for the animated item
const AnimatedListItem = React.memo(({ item, index, viewMode, navigation, scrollY }: {
  item: ListItem;
  index: number;
  viewMode: ViewMode;
  navigation: any;
  scrollY: Animated.SharedValue<number>;
}) => {
  const itemAnimatedStyle = useAnimatedStyle(() => {
    const itemOffset = index * 150;
    const diff = scrollY.value - itemOffset;
    
    const opacity = interpolate(
      diff,
      [-300, 0, 300],
      [1, 1, 0.3],
      'clamp'
    );

    const scale = interpolate(
      diff,
      [-300, 0, 300],
      [1, 1, 0.95],
      'clamp'
    );

    const translateY = interpolate(
      diff,
      [-300, 0, 300],
      [0, 0, 20],
      'clamp'
    );
    
    return {
      opacity,
      transform: [
        { scale },
        { translateY }
      ],
      backgroundColor: `rgba(30, 30, 35, ${interpolate(
        diff,
        [-300, 0, 300],
        [1, 1, 0.7],
        'clamp'
      )})`,
    };
  });

  if (viewMode === 'all') {
    return (
      <Animated.View style={[styles.cardWrapper, itemAnimatedStyle]}>
        <StudySetItem
          studySet={item as StudySet}
          onPress={() => navigation.navigate('StudySet', { id: item.id })}
        />
      </Animated.View>
    );
  }
  
  return (
    <Animated.View style={[styles.cardWrapper, itemAnimatedStyle]}>
      <FolderCard
        folder={item as Folder}
        onPress={() => navigation.navigate('Folder', { folderId: item.id })}
      />
    </Animated.View>
  );
});

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<Array<{
    uri: string;
    base64?: string;
  }> | undefined>(undefined);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const { folders, refreshFolders } = useFolders();
  const { studySets, refreshStudySets, loading: studySetsLoading } = useStudySets();
  const progress = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...StyleSheet.absoluteFillObject,
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    const initDb = async () => {
      try {
        console.log('Database connection successful');
      } catch (error) {
        console.error('Database connection failed:', error);
      }
    };
    
    initDb();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, refreshing data...');
      refreshFolders();
      refreshStudySets();
      
      const route = navigation.getState().routes.find(r => r.name === 'Home');
      const params = route?.params;
      
      if (params) {
        if ('refresh' in params && params.refresh) {
          console.log('Refresh parameter found, updating study sets...');
          refreshStudySets();
        }

        if ('openBottomSheet' in params && params.openBottomSheet) {
          setIsBottomSheetVisible(true);
          if ('existingPhotos' in params) {
            setExistingPhotos(params.existingPhotos);
          }
        }

        navigation.setParams({
          refresh: undefined,
          openBottomSheet: undefined,
          existingPhotos: undefined
        });
      }
    });

    return unsubscribe;
  }, [navigation, refreshFolders, refreshStudySets]);

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

  useEffect(() => {
    console.log('Study sets loading state:', studySetsLoading);
    console.log('Study sets:', studySets);
  }, [studySetsLoading, studySets]);

  const renderContent = () => {
    if (studySetsLoading) {
      return <LoadingIndicator />;
    }

    if (studySets.length === 0 && folders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.greeting}>
              Hei 👋🏻 {activeProfile?.name}!
            </Text>
            <Text style={styles.emptyMessage}>
              Mitä haluaisit harjoitella{'\n'}tänään?
            </Text>
          </View>
        </View>
      );
    }

    // Then update the FlatList implementation in renderContent():
    return (
      <>
        <Animated.FlatList
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          data={viewMode === 'all' ? studySets : folders}
          ListHeaderComponent={() => (
            <>
              <Text style={[styles.greeting, styles.greetingWithContent]}>
                Hei 👋🏻 {activeProfile?.name || ''}!{'\n'}
                Tervetuloa takaisin
              </Text>

              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'all' && styles.toggleButtonActive
                  ]}
                  onPress={() => setViewMode('all')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    viewMode === 'all' && styles.toggleButtonTextActive
                  ]}>
                    Kaikki setit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    viewMode === 'folders' && styles.toggleButtonActive
                  ]}
                  onPress={() => setViewMode('folders')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    viewMode === 'folders' && styles.toggleButtonTextActive
                  ]}>
                    Kansiot
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          renderItem={({ item, index }) => (
            <AnimatedListItem
              item={item}
              index={index}
              viewMode={viewMode}
              navigation={navigation}
              scrollY={scrollY}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              {viewMode === 'folders' && (
                <View style={styles.emptyIconContainer}>
                  <FolderIcon color={theme.colors.textSecondary} size={32} />
                </View>
              )}
              <Text style={styles.emptyText}>
                {viewMode === 'all' 
                  ? 'Sinulla ei ole vielä yhtään harjoittelusettiä'
                  : 'Sinulla ei ole vielä yhtään kansiota'
                }
              </Text>
            </View>
          )}
        />
      </>
    );
  };

  const handleCreatePress = () => {
    console.log('Create button pressed');
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
          style={styles.settingsButton}
          onPress={() => setIsSettingsVisible(true)}
        >
          <Hexagon color={theme.colors.text} size={20} />
          <View style={styles.settingsButtonDot} />
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

      <View style={styles.contentWrapper}>
        {renderContent()}
      </View>

      <View style={styles.createButtonContainer}>
        <BlurView intensity={20} tint="dark">
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePress}
          >
            <Text style={styles.createButtonText}>
              Luo uusi harjoittelusetti
            </Text>
          </TouchableOpacity>
        </BlurView>
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
              />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {isSettingsVisible && (
        <SettingsScreen 
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
  contentWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    marginTop: 120,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  scrollViewWithContent: {
    paddingTop: 48,
  },
  greeting: {
    fontSize: 24,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  greetingWithContent: {
    textAlign: 'left',
    fontSize: 28,
    marginBottom: theme.spacing.lg,
  },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  toggleButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 100,
    backgroundColor: theme.colors.background02,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.text,
    borderWidth: 0,
  },
  toggleButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: theme.colors.background,
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: '4%',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 3,
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    opacity: 0.9,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background02,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: '30%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  emptyMessage: {
    fontSize: 20,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    top: '10%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  header: {
    position: 'absolute',
    top: 64,
    right: theme.spacing.lg,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  settingsButtonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -2 }, { translateY: -2 }],
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
  listContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  cardWrapper: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
