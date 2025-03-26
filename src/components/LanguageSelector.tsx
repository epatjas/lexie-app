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
  ScrollView,
} from 'react-native';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '../i18n/LanguageContext';
import theme from '../styles/theme';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  onBack,
}) => {
  const { t, language, changeLanguage, availableLanguages } = useTranslation();
  
  // Use a single animation for the sheet
  const [sheetAnimation] = React.useState(new Animated.Value(SCREEN_HEIGHT));
  
  // Run animation when visibility changes
  React.useEffect(() => {
    if (visible) {
      // Animate the sheet up from the bottom
      Animated.timing(sheetAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate the sheet down
      Animated.timing(sheetAnimation, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, sheetAnimation]);

  // Handle language selection - making sure we use the type that matches availableLanguages
  const handleLanguageSelect = (langCode: string) => {
    // Cast to any to bypass the type error since we know these are valid language codes
    changeLanguage(langCode as any);
    onClose();
  };

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
        {/* Sheet that slides up from bottom */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: sheetAnimation }],
            },
          ]}
        >
          <View style={styles.handle} />
          
          {/* Header with back button */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <ChevronLeft color={theme.colors.text} size={20} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('settings.language')}</Text>
            <View style={{ width: 20 }} />
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.languageOptionsContainer}>
              {availableLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.optionRow}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text 
                    style={[
                      styles.languageText,
                      language === lang.code && styles.selectedLanguageText
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <View style={styles.selectedIndicator}>
                      <Check color="#000" size={12} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.stroke,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
    flex: 1,
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  languageOptionsContainer: {
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  languageText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  selectedLanguageText: {
    color: theme.colors.primary,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LanguageSelector; 