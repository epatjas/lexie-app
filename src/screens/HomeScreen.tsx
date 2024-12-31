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
import { Folder as FolderIcon } from 'lucide-react-native';
import CreateStudySetBottomSheet from '../components/CreateStudySetBottomSheet';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import ParticleBackground from '../components/ParticleBackground';
import { getActiveProfile } from '../utils/storage';
import { resetStorage } from '../utils/storage';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type ViewMode = 'all' | 'folders';
type ListItem = StudySet | (Folder & { study_set_count?: number });

const DEBUG = false;

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<Array<{
    uri: string;
    base64?: string;
  }> | undefined>(undefined);

  const { folders, refreshFolders } = useFolders();
  const { studySets, refreshStudySets, loading: studySetsLoading } = useStudySets();
  const progress = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...StyleSheet.absoluteFillObject,
  }));

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
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePress}
          >
            <Text style={styles.createButtonText}>
              Luo uusi harjoitussetti
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Use FlatList for both views
    return (
      <>
        <FlatList<ListItem>
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
          renderItem={({ item }) => {
            if (viewMode === 'all') {
              return (
                <StudySetItem
                  studySet={item as StudySet}
                  onPress={() => navigation.navigate('StudySet', { id: item.id })}
                />
              );
            } else {
              return (
                <FolderCard
                  folder={item as Folder}
                  onPress={() => navigation.navigate('Folder', { folderId: item.id })}
                />
              );
            }
          }}
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

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePress}
        >
          <Text style={styles.createButtonText}>
            Luo uusi harjoittelusetti
          </Text>
        </TouchableOpacity>
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
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <View style={styles.header}>
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

      {__DEV__ && (
        <TouchableOpacity 
          style={styles.devButton} 
          onPress={async () => {
            await resetStorage();
            navigation.replace('Welcome');
          }}
        >
          <Text style={styles.devButtonText}>Reset App</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
    marginTop: 80,
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
  createButton: {
    position: 'absolute',
    bottom: '8%',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
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
  devButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 8,
    backgroundColor: theme.colors.background02,
    borderRadius: 8,
  },
  devButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  header: {
    position: 'absolute',
    top: 64,
    right: theme.spacing.lg,
    zIndex: 1,
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
    paddingBottom: 100,
  },
});
