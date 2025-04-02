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
import { X, Folder, MoreVertical, ChevronLeft, Check } from 'lucide-react-native';
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
import { useTranslation } from '../i18n/LanguageContext';
import { updateStudySetFolder } from '../services/Database';

interface FolderSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  folders: FolderType[];
  selectedFolderId?: string | null;
  selectedStudySetId?: string;
  onSelect: (folderId: string | null) => void;
  onUpdateFolder: (folderId: string, name: string, color: string) => void;
}

const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Folder 
          size={20}
          color={theme.colors.textSecondary}
        />
      </View>
      <Text style={styles.emptyStateText}>
        {t('folders.selection.empty')}
      </Text>
    </View>
  );
}

const FolderItem = ({ folder, isSelected, onPress, onMorePress }) => (
  <TouchableOpacity
    style={styles.folderItem}
    onPress={onPress}
  >
    <View style={styles.folderItemContent}>
      <Text 
        style={[
          styles.folderName,
          isSelected && styles.folderNameSelected
        ]}
      >
        {folder.name}
      </Text>
    </View>
    <View style={styles.folderItemActions}>
      {isSelected && (
        <View style={styles.checkCircle}>
          <Check color={theme.colors.background} size={14} />
        </View>
      )}
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={onMorePress}
      >
        <MoreVertical color={theme.colors.textSecondary} size={20} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

export default function FolderSelectModal({
  visible,
  onClose,
  onCreateNew,
  folders,
  selectedFolderId,
  selectedStudySetId,
  onSelect,
  onUpdateFolder,
}: FolderSelectModalProps) {
  const { t } = useTranslation();
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
      opacity: progress.value,
      backgroundColor: 'rgba(0,0,0,0.5)',
      ...StyleSheet.absoluteFillObject,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    const translateY = 1000 - (progress.value * 1000);

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
        Alert.alert(t('alerts.error'), t('folders.edit.alerts.saveError'));
      }
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    try {
      onSelect(folderId);
      
      if (selectedStudySetId) {
        await updateStudySetFolder(selectedStudySetId, folderId);
      }
      
      onClose();
    } catch (error) {
      console.error('Error selecting folder:', error);
      Alert.alert(t('alerts.error'), t('alerts.assignToFolderFailed'));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { zIndex: 9999 }]}>
        <Animated.View style={overlayStyle}>
          <View style={styles.container}>
            <Animated.View style={modalStyle}>
              <View style={styles.dragHandleContainer}>
                <DragHandle />
              </View>

              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                  <ChevronLeft color={theme.colors.text} size={20} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('folders.selection.title')}</Text>
              </View>

              <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
              >
                {folders.length === 0 ? (
                  <EmptyState />
                ) : (
                  <>
                    <Text style={styles.subTitle}>{t('folders.selection.subtitle')}</Text>
                    {folders.map(folder => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        isSelected={folder.id === selectedFolderId}
                        onPress={() => handleFolderSelect(folder.id)}
                        onMorePress={() => handleMorePress(folder)}
                      />
                    ))}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.createButton}
                onPress={onCreateNew}
              >
                <Text style={styles.createButtonText}>{t('folders.selection.createButton')}</Text>
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
      </View>
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
    paddingVertical: theme.spacing.md,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.lg,
    zIndex: 1,
  },
  subTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
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
  folderName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  folderNameSelected: {
    color: theme.colors.primary,
  },
  folderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A2B8FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
}); 