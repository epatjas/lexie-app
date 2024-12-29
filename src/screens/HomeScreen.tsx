import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { StudySet } from '../types/types';
import StudySetItem from '../components/StudySetItem';
import { useFolders } from '../hooks/useFolders';
import { useStudySets } from '../hooks/useStudySet';
import FolderCard from '../components/FolderCard';
import { Folder } from 'lucide-react-native';
import FolderCreationModal from '../components/FolderCreationModal';
import { testDatabaseConnection } from '../services/Database';
import CreateStudySetBottomSheet from '../components/CreateStudySetBottomSheet';
import Animated, { 
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParticleBackground from '../components/ParticleBackground';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type ViewMode = 'all' | 'folders';

const DEBUG = false;

const LoadingIndicator = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const { folders, refreshFolders, loading, addFolder } = useFolders();
  const { studySets, refreshStudySets, loading: studySetsLoading } = useStudySets();
  const [modalVisible, setModalVisible] = useState(false);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const progress = useSharedValue(0);
  const [userName, setUserName] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await testDatabaseConnection();
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
      const params = navigation.getState().routes.find(r => r.name === 'Home')?.params;
      if (params && 'refresh' in params && params.refresh) {
        console.log('Refresh parameter found, updating study sets...');
        refreshStudySets();
        navigation.setParams({ refresh: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, refreshFolders, refreshStudySets]);

  useEffect(() => {
    const getUserName = async () => {
      try {
        const name = await AsyncStorage.getItem('@user_name');
        if (name) {
          setUserName(name);
        }
      } catch (error) {
        console.error('Error getting user name:', error);
      }
    };

    getUserName();
  }, []);

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      await addFolder(name, color);
      await refreshFolders();
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const isEmpty = studySets.length === 0;

  const getStudySetsByFolder = (folderId: string) => {
    console.log('Study Sets Structure:', studySets.map(set => ({
      id: set.id,
      title: set.title,
      folder_id: set.folder_id
    })));
    
    return studySets.filter((set: StudySet) => {
      if (typeof set.folder_id !== typeof folderId) {
        console.warn(`Type mismatch: set.folder_id (${typeof set.folder_id}) vs folderId (${typeof folderId})`);
        console.warn(`Values: set.folder_id = ${set.folder_id}, folderId = ${folderId}`);
      }
      return set.folder_id === folderId;
    });
  };

  const renderContent = () => {
    if (viewMode === 'folders') {
      if (folders.length === 0) {
        return (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Folder color={theme.colors.textSecondary} size={32} />
            </View>
            <Text style={styles.emptyText}>
              Sinulla ei ole vielä yhtään kansiota
            </Text>
          </View>
        );
      }

      return folders.map(folder => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onPress={() => navigation.navigate('Folder', { folderId: folder.id })}
        />
      ));
    }

    return studySets.map((studySet: StudySet) => (
      <StudySetItem
        key={studySet.id}
        studySet={studySet}
        onPress={() => navigation.navigate('StudySet', { id: studySet.id })}
      />
    ));
  };

  const handleCreatePress = () => {
    console.log('Create button pressed');
    setIsBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetVisible(false);
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

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      backgroundColor: 'rgba(0,0,0,0.5)',
      ...StyleSheet.absoluteFillObject,
    };
  });

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

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Tulossa pian</Text>
        </View>
      )}
      
      <FolderCreationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={handleCreateFolder}
        onSuccess={refreshFolders}
      />
      
      {studySetsLoading ? (
        <LoadingIndicator />
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.greeting}>
              Hei 👋🏻 {userName}!
            </Text>
            <Text style={styles.emptyMessage}>
              Mitä haluaisit oppia{'\n'}tänään?
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePress}
          >
            <Text style={styles.createButtonText}>Create your first study set</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={[
            styles.scrollView,
            !isEmpty && styles.scrollViewWithContent
          ]}>
            <Text style={[
              styles.greeting,
              !isEmpty && styles.greetingWithContent
            ]}>
              Hei 👋 {userName}!{'\n'}
              Tervetuloa takaisin
            </Text>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'all' && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode('all')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'all' && styles.toggleButtonTextActive,
                ]}>
                  Kaikki setit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'folders' && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode('folders')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'folders' && styles.toggleButtonTextActive,
                ]}>
                  Kansiot
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {renderContent()}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              console.log('Main create button pressed');
              handleCreatePress();
            }}
          >
            <Text style={styles.createButtonText}>Luo uusi harjoittelusetti</Text>
          </TouchableOpacity>
        </>
      )}
      
      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseBottomSheet}
      >
        <Animated.View style={overlayStyle}>
          <SafeAreaView style={styles.modalContainer}>
            <Animated.View style={modalStyle}>
              <CreateStudySetBottomSheet onClose={handleCloseBottomSheet} />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    marginBottom: 8,
    textAlign: 'center',
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
  content: {
    flex: 1,
  },
  createButton: {
    position: 'absolute',
    bottom: '8%',
    left: '10%',
    right: '10%',
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
    fontWeight: '500',
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
    paddingHorizontal: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    paddingBottom: '20%',
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
});
