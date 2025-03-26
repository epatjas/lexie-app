import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Folder, Trash2, Globe, Type, ChevronRight, ChevronLeft, Check } from 'lucide-react-native';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';

interface StudySetSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onFolderPress: () => void;
  onDeletePress: () => void;
  onTranslatePress: () => void;
  onChangeFontPress: () => void;
  onLanguagePress?: () => void;
  hasFolderAssigned?: boolean;
  folderName?: string;
  folderColor?: string;
  language?: string;
  selectedFont?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const StudySetSettingsSheet: React.FC<StudySetSettingsSheetProps> = ({
  visible,
  onClose,
  onFolderPress,
  onDeletePress,
  onTranslatePress,
  onChangeFontPress,
  onLanguagePress,
  hasFolderAssigned = false,
  folderName = '',
  folderColor = '#888',
  language = 'English',
  selectedFont = 'Standard',
}) => {
  const { t } = useTranslation();
  const [animation] = React.useState(new Animated.Value(SCREEN_HEIGHT));

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, animation]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: animation }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.languageSection}>
            <Text style={styles.languageLabel}>
              {t('studySetSettings.language')}
            </Text>
            <View style={styles.languageValueContainer}>
              <Text style={styles.languageValue}>
                {language}
              </Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>{t('settings.comingSoon')}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.option} onPress={onFolderPress}>
            <Folder color={theme.colors.text} size={20} />
            <Text style={styles.optionText}>
              {t('studySetSettings.chooseFolder')}
            </Text>
            
            <View style={styles.rightContainer}>
              {hasFolderAssigned && folderName && (
                <Text style={[styles.folderNameText, { color: folderColor }]}>
                  {folderName}
                </Text>
              )}
              <ChevronRight color={theme.colors.textSecondary} size={20} style={styles.chevronIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onChangeFontPress}>
            <Type color={theme.colors.text} size={20} />
            <Text style={styles.optionText}>{t('studySetSettings.chooseFont')}</Text>
            <View style={styles.rightContainer}>
              <Text style={styles.selectionText}>{selectedFont}</Text>
              <ChevronRight color={theme.colors.textSecondary} size={20} style={styles.chevronIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteOption} onPress={onDeletePress}>
            <Trash2 color="#FFFFFF" size={20} />
            <Text style={styles.deleteText}>{t('studySetSettings.deleteLesson')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  closeArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.background01,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.stroke,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
  },
  optionText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    marginLeft: 10,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 0,
  },
  deleteText: {
    fontSize: theme.fontSizes.md,
    color: '#FFFFFF',
    marginLeft: 10,
    fontFamily: theme.fonts.medium,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.background02,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  folderNameText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginRight: 8,
  },
  selectionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
    marginRight: 8,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  languageSection: {
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    paddingHorizontal: 12,
    marginHorizontal: -5,
  },
  languageLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
  },
  languageValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
  },
  languageValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default StudySetSettingsSheet; 