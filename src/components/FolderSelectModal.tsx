import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Folder, MoreVertical } from 'lucide-react-native';
import Animated, { 
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown,
} from 'react-native-reanimated';
import theme from '../styles/theme';
import { Folder as FolderType } from '../types/types';
import { FOLDER_COLORS } from '../constants/colors';
import FolderEditModal from './FolderEditModal';
import DragHandle from './DragHandle';

interface FolderSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  folders: FolderType[];
  selectedFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
  onUpdateFolder: (folderId: string, name: string, color: string) => void;
}

export default function FolderSelectModal({
  visible,
  onClose,
  onCreateNew,
  folders,
  selectedFolderId,
  onSelect,
  onUpdateFolder,
}: FolderSelectModalProps) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);

  const handleMorePress = (folder: FolderType) => {
    setSelectedFolder(folder);
    setEditModalVisible(true);
  };

  const handleEditClose = () => {
    setEditModalVisible(false);
    setSelectedFolder(null);
  };

  const handleDeleteFolder = async () => {
    // Add delete functionality
    setEditModalVisible(false);
    setSelectedFolder(null);
  };

  const handleSaveFolder = async (name: string, color: string) => {
    if (selectedFolder) {
      try {
        await onUpdateFolder(selectedFolder.id, name, color);
        setEditModalVisible(false);
        setSelectedFolder(null);
      } catch (error) {
        console.error('Error saving folder:', error);
        Alert.alert('Error', 'Failed to save folder changes');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        entering={FadeIn}
        exiting={FadeOut}
        style={StyleSheet.absoluteFill}
      >
        <SafeAreaView style={styles.container}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.contentContainer}
          >
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Kansiot</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <Text style={styles.subTitle}>Valitse tai luo uusi kansio</Text>

              {folders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderItem}
                  onPress={() => onSelect(folder.id)}
                >
                  <View style={styles.folderItemContent}>
                    <View 
                      style={[
                        styles.folderTag,
                        { backgroundColor: folder.color }
                      ]}
                    >
                      <Text style={styles.folderName}>{folder.name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => handleMorePress(folder)}
                  >
                    <MoreVertical color={theme.colors.textSecondary} size={20} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateNew}
            >
              <Text style={styles.createButtonText}>Luo uusi kansio</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>

      {selectedFolder && (
        <FolderEditModal
          visible={editModalVisible}
          onClose={handleEditClose}
          onDelete={handleDeleteFolder}
          onSave={handleSaveFolder}
          folderName={selectedFolder.name}
          folderColor={selectedFolder.color}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background02,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    position: 'relative',
  },
  headerTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  subTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  folderItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderTag: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  folderName: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.background,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: 64,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
}); 