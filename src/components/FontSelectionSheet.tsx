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
import theme from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings, FONT_SETTINGS_KEY } from '../types/fontSettings';

interface FontSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  selectedFont: string;
  fontSize: number;
  isAllCaps: boolean;
  onFontChange: (settings: FontSettings) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FONT_OPTIONS = [
  "Standard",
  "Reading",
  "Dyslexia-friendly",
  "High-visibility",
  "Monospaced"
];

const FontSelectionSheet: React.FC<FontSelectionSheetProps> = ({
  visible,
  onClose,
  onBack,
  selectedFont,
  fontSize,
  isAllCaps,
  onFontChange,
}) => {
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

  const saveSettings = async (font: string, caps: boolean) => {
    const settings: FontSettings = {
      font: font,
      size: fontSize,
      isAllCaps: caps
    };
    
    try {
      await AsyncStorage.setItem(FONT_SETTINGS_KEY, JSON.stringify(settings));
      onFontChange(settings);
    } catch (error) {
      console.error('Error saving font settings:', error);
    }
  };

  const handleFontSelect = async (font: string) => {
    await saveSettings(font, isAllCaps);
  };

  const handleCapsToggle = async (caps: boolean) => {
    await saveSettings(selectedFont, caps);
  };

  const getFontStyle = (font: string) => {
    const baseStyle = {
      fontSize: 18,
      color: theme.colors.text,
    };
    
    switch (font) {
      case "Reading":
        return { ...baseStyle, fontFamily: 'Georgia' };
      case "Dyslexia-friendly":
        return { ...baseStyle, fontFamily: 'OpenDyslexic' };
      case "High-visibility":
        return { ...baseStyle, fontFamily: 'AtkinsonHyperlegible' };
      case "Monospaced":
        return { ...baseStyle, fontFamily: 'IBMPlexMono' };
      default: // Standard
        return { ...baseStyle, fontFamily: theme.fonts.regular };
    }
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
          
          {/* Regular static content - no separate animation */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <ChevronLeft color={theme.colors.text} size={20} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose font</Text>
            <View style={{ width: 20 }} />
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.fontOptionsContainer}>
              {FONT_OPTIONS.map((font) => (
                <TouchableOpacity
                  key={font}
                  style={styles.optionRow}
                  onPress={() => handleFontSelect(font)}
                >
                  <Text style={getFontStyle(font)}>{font}</Text>
                  {selectedFont === font && (
                    <View style={styles.selectedIndicator}>
                      <Check color="#000" size={12} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>CASE</Text>
            <View style={styles.caseOptions}>
              <TouchableOpacity
                style={[
                  styles.caseOption,
                  !isAllCaps && styles.selectedCaseOption
                ]}
                onPress={() => handleCapsToggle(false)}
              >
                <Text style={styles.caseOptionText}>Aa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.caseOption,
                  isAllCaps && styles.selectedCaseOption
                ]}
                onPress={() => handleCapsToggle(true)}
              >
                <Text style={styles.caseOptionText}>AA</Text>
              </TouchableOpacity>
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
  fontOptionsContainer: {
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
 
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 1,
  },
  caseOptions: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    marginBottom: 24,
  },
  caseOption: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  selectedCaseOption: {
    backgroundColor: theme.colors.background02,
  },
  caseOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
});

export default FontSelectionSheet; 