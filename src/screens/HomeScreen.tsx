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
          <View style={styles.emptyContent}>
            <Text style={styles.greeting}>
              Hei 👋🏻 Ilona!
            </Text>
            <Text style={styles.emptyMessage}>
              Mitä haluaisit oppia tänään?
            </Text>
            <TouchableOpacity
              style={[styles.createButton, styles.createButtonEmpty]}
              onPress={() => {
                console.log('Empty state create button pressed');
                handleCreatePress();
              }}
            >
              <Text style={styles.createButtonText}>Luo uusi harjoittelusetti</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView}>
            <Text style={styles.greeting}>
              Hei 👋🏻 Ilona!{'\n'}
              Tervetuloa takaisin.
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
  greeting: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: 64,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.lg,
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
    paddingBottom: theme.spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyMessage: {
    fontSize: 18,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  createButtonEmpty: {
    width: '80%',
    marginTop: theme.spacing.md,
    marginBottom: 0,
    marginHorizontal: 0,
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
});
