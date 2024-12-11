import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft, MoreVertical, BookOpen } from 'lucide-react-native';
import theme from '../styles/theme';
import { useStudySets } from '../hooks/useStudySet';
import { useFolders } from '../hooks/useFolders';
import StudySetItem from '../components/StudySetItem';
import FolderEditModal from '../components/FolderEditModal';

type FolderScreenProps = NativeStackScreenProps<RootStackParamList, 'Folder'>;

export default function FolderScreen({ route, navigation }: FolderScreenProps) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const { folderId } = route.params;
  const { studySets, refreshStudySets } = useStudySets();
  const { folders, updateFolder, deleteFolder } = useFolders();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('FolderScreen focused - refreshing data');
      refreshStudySets();
    });

    return unsubscribe;
  }, [navigation, refreshStudySets]);

  console.log('Current folder ID:', folderId);
  console.log('All study sets:', studySets);
  console.log('Filtered study sets:', studySets.filter(set => set.folder_id === folderId));
  
  const currentFolder = folders.find(f => f.id === folderId);
  const folderStudySets = studySets.filter(set => {
    console.log('Comparing:', {
      setFolderId: set.folder_id,
      folderId: folderId,
      matches: set.folder_id === folderId
    });
    return set.folder_id === folderId;
  });

  if (!currentFolder) {
    return null;
  }

  const handleDeleteFolder = async () => {
    try {
      await deleteFolder(folderId);
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting folder:', error);
      Alert.alert('Error', 'Failed to delete folder');
    }
  };

  const handleSaveFolder = async (name: string, color: string) => {
    try {
      await updateFolder(currentFolder.id, name, color);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error saving folder:', error);
      Alert.alert('Error', 'Failed to save folder changes');
    }
  };

  const renderContent = () => {
    if (folderStudySets.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <BookOpen color={theme.colors.textSecondary} size={32} />
          </View>
          <Text style={styles.emptyText}>
            Tässä kansiossa ei ole vielä harjoittelusettejä
          </Text>
        </View>
      );
    }

    return folderStudySets.map(studySet => (
      <StudySetItem
        key={studySet.id}
        studySet={studySet}
        onPress={() => navigation.navigate('StudySet', { id: studySet.id })}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{currentFolder.name}</Text>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setEditModalVisible(true)}
        >
          <MoreVertical color={theme.colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>

      <FolderEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onDelete={handleDeleteFolder}
        onSave={handleSaveFolder}
        folderName={currentFolder.name}
        folderColor={currentFolder.color}
      />
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
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  moreButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
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
}); 