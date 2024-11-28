import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { X, Check, Trash2 } from 'lucide-react-native';
import Animated, { 
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown 
} from 'react-native-reanimated';
import theme from '../styles/theme';
import { FOLDER_COLOR_OPTIONS } from '../constants/colors';

interface FolderEditModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (name: string, color: string) => void;
  folderName: string;
  folderColor: string;
}

export default function FolderEditModal({
  visible,
  onClose,
  onDelete,
  onSave,
  folderName,
  folderColor,
}: FolderEditModalProps) {
  const [name, setName] = useState(folderName);
  const [selectedColor, setSelectedColor] = useState(folderColor);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onSave(name, color);
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
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <SafeAreaView style={styles.container}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.contentContainer}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{folderName}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.inputSection}>
                <Text style={styles.label}>Kansion nimi</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Anna kansiolle nimi"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.colorSection}>
                <Text style={styles.label}>Valitse väri</Text>
                <View style={styles.colorGrid}>
                  {FOLDER_COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color.id}
                      style={styles.colorOption}
                      onPress={() => handleColorSelect(color.value)}
                    >
                      <View style={styles.colorOptionContent}>
                        <View 
                          style={[
                            styles.colorSquare,
                            { backgroundColor: color.value }
                          ]}
                        />
                        <Text style={styles.colorName}>{color.name}</Text>
                      </View>
                      {selectedColor === color.value && (
                        <Check color={theme.colors.text} size={20} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
            >
              <Trash2 color={theme.colors.text} size={20} />
              <Text style={styles.deleteButtonText}>Poista</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background02,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    position: 'relative',
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputSection: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  colorSection: {
    marginBottom: theme.spacing.xl,
  },
  colorGrid: {
    gap: theme.spacing.sm,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  colorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  colorSquare: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.md,
  },
  colorName: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    borderRadius: 64,
    backgroundColor: theme.colors.background02,
    gap: theme.spacing.sm,
  },
  deleteButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
}); 