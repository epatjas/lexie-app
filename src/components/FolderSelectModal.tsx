import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Folder, MoreVertical } from 'lucide-react-native';
import Animated, { 
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
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

const EmptyState = () => (
  <View style={styles.emptyStateContainer}>
    <View style={styles.emptyStateIconContainer}>
      <Folder 
        size={20}
        color={theme.colors.textSecondary}
      />
    </View>
    <Text style={styles.emptyStateText}>
      Sinulla ei ole vielä kansiota
    </Text>
  </View>
);

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

  const progress = useSharedValue(0);

  React.useEffect(() => {
    console.log('Modal visibility changed:', visible);
    if (visible) {
      progress.value = withTiming(1, { duration: 300 });
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

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
      backgroundColor: theme.colors.background01,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '92%',
      paddingTop: theme.spacing.xs,
    };
  });

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
      <Animated.View style={overlayStyle}>
        <View style={styles.container}>
          <Animated.View style={modalStyle}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Kansiot</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color={theme.colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
            >
              {folders.length === 0 ? (
                <EmptyState />
              ) : (
                <>
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
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateNew}
            >
              <Text style={styles.createButtonText}>Luo uusi kansio</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    justifyContent: 'flex-end',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.lg,
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
  scrollContent: {
    flexGrow: 1,
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
    backgroundColor: theme.colors.text,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: 100,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 50,
    backgroundColor: theme.colors.background02,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 