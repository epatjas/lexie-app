import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TextStyle,
  ViewStyle,
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySet';
import { ChevronLeft, FlipHorizontal, Zap, Folder, Calendar, MoreVertical, Plus, Trash2, Play, Pause, Rewind, FastForward, X, ChevronRight, Check } from 'lucide-react-native';
import { useFolders } from '../hooks/useFolders';
import FolderSelectModal from '../components/FolderSelectModal';
import FolderCreationModal from '../components/FolderCreationModal';
import Markdown from 'react-native-markdown-display';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import Svg, { Path, G, Rect } from 'react-native-svg';
import StudySetSettingsSheet from '../components/StudySetSettingsSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';
import { CommonActions } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import FontSelectionSheet from '../components/FontSelectionSheet';


type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;

// Define the markdown styles type
type MarkdownStylesObject = {
  [key: string]: TextStyle | ViewStyle;
};

// Add these interfaces at the top of the file
interface TextSection {
  type: 'heading' | 'paragraph' | 'list' | 'definition' | 'quote';
  level?: number;
  raw_text: string;
  items?: string[];
  style?: 'bullet' | 'numbered';
}

const StackedCardsIcon = ({ width = 150, height = 150, style }) => (
  <Svg width={width} height={height} viewBox="0 0 150 150" style={style}>
    {/* SVG content here - simplified stacked cards */}
    <G>
      <Rect x="50" y="30" width="80" height="100" rx="10" fill="#FFFFFF" />
      <Rect x="40" y="40" width="80" height="100" rx="10" fill="#E5C07B" />
      <Rect x="30" y="50" width="80" height="100" rx="10" fill="#98BDF7" />
    </G>
  </Svg>
);

// Add this constant
const FONT_SETTINGS_KEY = 'global_font_settings';

export default function StudySetScreen({ route, navigation }: StudySetScreenProps): React.JSX.Element {
  const [folderSelectVisible, setFolderSelectVisible] = useState(false);
  const [folderCreateVisible, setFolderCreateVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Coming soon");
  const { folders, addFolder, assignStudySetToFolder, updateFolder } = useFolders();
  const { studySet, refreshStudySet, loading, deleteStudySet } = useStudySetDetails(route.params?.id);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  const [fontSheetVisible, setFontSheetVisible] = useState(false);

  // Load global font settings
  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(FONT_SETTINGS_KEY);
        if (storedSettings) {
          setFontSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('[StudySet] Error loading font settings:', error);
      }
    };
    
    loadFontSettings();
  }, []);
  
  // We should also refresh font settings when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(FONT_SETTINGS_KEY);
        if (storedSettings) {
          setFontSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('[StudySet] Error refreshing font settings:', error);
      }
    });
    
    return unsubscribe;
  }, [navigation]);

  const constructAudioText = (studySet: any): string => {
    if (!studySet.text_content?.sections) return '';

    // Add long pause after main title using commas and spaces
    let audioText = `${studySet.title}, , , \u2003 \u2003 \u2003`;

    studySet.text_content.sections.forEach((section: any) => {
      if (section.type === 'heading') {
        // Long pause before and after headings
        audioText += `\u2003 \u2003 \u2003 ${section.raw_text}, , , \u2003 \u2003 \u2003`;
      } else if (section.type === 'paragraph' || section.type === 'definition') {
        // Medium pause after paragraphs
        audioText += `${section.raw_text}, , \u2003 \u2003`;
      } else if (section.type === 'list' && Array.isArray(section.items)) {
        // Short pauses between list items and medium pause after list
        audioText += section.items.map((item: string): string => 
          `${item}, \u2003`
        ).join('') + ', \u2003 \u2003';
      }
    });

    return audioText;
  };

  const { isPlaying, currentTime, togglePlayback, error, isLoading, progress, seek } = useAudioPlayback({
    text: studySet ? constructAudioText(studySet) : '',
  });

  useEffect(() => {
    if (!route.params?.id) {
      console.warn('[StudySet] No study set ID provided');
    }
  }, [route.params?.id]);

  useEffect(() => {
    if (studySet) {
      console.log("StudySet loaded with ID:", route.params?.id);
      console.log("Quiz data available:", !!studySet.quiz);
      console.log("First quiz questions:", studySet.quiz?.slice(0, 2));
    }
  }, [studySet, route.params?.id]);

  useEffect(() => {
    // console.log('Should render FolderCreationModal:', folderCreateVisible);
  }, [folderCreateVisible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showMoreOptions) {
        setShowMoreOptions(false);
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [showMoreOptions]);

  useEffect(() => {
    const loadFontSettings = async () => {
      try {
        if (!route.params?.id) return;
        
        const storedSettings = await AsyncStorage.getItem(`font_settings_${route.params.id}`);
        if (storedSettings) {
          setFontSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('[StudySet] Error loading font settings:', error);
      }
    };
    
    loadFontSettings();
  }, [route.params?.id]);
  
  useEffect(() => {
    if (route.params?.fontSettings) {
      setFontSettings(route.params.fontSettings);
      
      // Save to AsyncStorage
      const saveSettings = async () => {
        try {
          await AsyncStorage.setItem(
            `font_settings_${route.params.id}`,
            JSON.stringify(route.params.fontSettings)
          );
        } catch (error) {
          console.error('[StudySet] Error saving font settings:', error);
        }
      };
      
      saveSettings();
    }
  }, [route.params?.fontSettings, route.params?.id]);

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      const newFolder = await addFolder(name, color);
      if (route.params?.id && newFolder) {
        await assignStudySetToFolder(route.params.id, newFolder.id);
        await refreshStudySet();
      }
      setFolderCreateVisible(false);
      setFolderSelectVisible(false);
    } catch (error) {
      console.error('[StudySet] Folder creation error:', error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    try {
      if (route.params?.id) {
        await assignStudySetToFolder(route.params.id, folderId);
        await refreshStudySet();
      }
      setFolderSelectVisible(false);
    } catch (error) {
      console.error('[StudySet] Folder selection error:', error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('Error', 'Failed to assign study set to folder');
    }
  };

  const handleCreateNewFolder = () => {
    console.log('Opening folder creation modal');
    setFolderCreateVisible(true);
  };

  const handleCreateQuiz = () => {
    if (route.params?.id) {
      console.log("Navigating to Quiz with studySetId:", route.params.id);
      navigation.navigate('Quiz', {
        quiz: [], // Always pass an empty array
        studySetId: route.params.id
      });
    }
  };

  const handleFlashcardsPress = () => {
    if (route.params?.id) {
      navigation.navigate('Flashcards', { studySetId: route.params.id });
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Poista harjoittelusetti",
      "Haluatko varmasti poistaa tämän harjoittelusetin? Tätä toimintoa ei voi kumota.",
      [
        {
          text: "Peruuta",
          style: "cancel"
        },
        {
          text: "Poista",
          onPress: async () => {
            try {
              if (!route.params?.id) return;
              await deleteStudySet(route.params.id);
              navigation.navigate('Home', { refresh: true } as const);
            } catch (error) {
              console.error('Error deleting study set:', error);
              Alert.alert('Virhe', 'Harjoittelusetin poistaminen epäonnistui');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleListenPress = async () => {
    try {
      setShowAudioPlayer(true);
      await togglePlayback();
    } catch (err) {
      console.error('[Screen] Listen press error:', err);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const checkAnswer = (selectedAnswer: string, correctAnswer: string) => {
    // Simple exact match since we removed letter prefixes
    const isCorrect = selectedAnswer === correctAnswer;
    
    console.log('Selected Answer:', selectedAnswer);
    console.log('Correct Answer:', correctAnswer);
    console.log('Are they equal?:', isCorrect);
    
    return isCorrect;
  };

  const getFontFamily = () => {
    switch (fontSettings.font) {
      case 'Reading':
        return 'Georgia';
      case 'Dyslexia-friendly':
        return 'OpenDyslexic';
      case 'High-visibility':
        return 'AtkinsonHyperlegible';
      case 'Monospaced':
        return 'IBMPlexMono';
      default: // Standard
        return theme.fonts.regular;
    }
  };

  const convertSectionsToMarkdown = (sections: TextSection[]): string => {
    if (!sections || !Array.isArray(sections)) return '';
    
    return sections.map(section => {
      switch (section.type) {
        case 'heading':
          // Add the appropriate number of # characters based on heading level
          const headingMarker = '#'.repeat(section.level || 1);
          return `${headingMarker} ${section.raw_text}\n\n`;
          
        case 'paragraph':
          return `${section.raw_text}\n\n`;
          
        case 'list':
          if (!section.items || !Array.isArray(section.items)) return '';
          
          if (section.style === 'numbered') {
            // Clean up any existing numbers from items first
            const cleanedItems = section.items.map(item => {
              // Remove any leading numbers and dots (like "1. ", "2. ", etc.)
              return item.replace(/^\s*\d+\.\s*/, '');
            });
            
            // Now use the cleaned items with our 1. prefix
            return cleanedItems.map(item => `1. ${item}`).join('\n') + '\n\n';
          } else {
            // For bullet lists, also clean up any existing bullets
            const cleanedItems = section.items.map(item => {
              // Remove any leading bullets (like "• ", "* ", "- ")
              return item.replace(/^\s*[•*-]\s*/, '');
            });
            
            return cleanedItems.map(item => `* ${item}`).join('\n') + '\n\n';
          }
          
        case 'definition':
          return `**${section.raw_text}**\n\n`;
          
        case 'quote':
          return `> ${section.raw_text}\n\n`;
          
        default:
          return `${section.raw_text}\n\n`;
      }
    }).join('');
  };

  const renderMarkdownContent = (content: string) => {
    // Define the text transform as a specific literal type, not a generic string
    const textTransformValue = fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const;
    // Also define fontStyle as a specific literal type
    const italicFontStyle = 'italic' as const; // Type assertion for fontStyle
    
    const customMarkdownStyles = {
      ...markdownStyles,
      text: {
        ...markdownStyles.text,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        textTransform: textTransformValue,
      },
      paragraph: {
        ...markdownStyles.paragraph,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        textTransform: textTransformValue,
      },
      heading1: {
        ...markdownStyles.heading1,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size + 8,
        textTransform: textTransformValue,
      },
      heading2: {
        ...markdownStyles.heading2,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size + 4,
        textTransform: textTransformValue,
      },
      heading3: {
        ...markdownStyles.heading3,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size + 2,
        textTransform: textTransformValue,
      },
      bullet_list: {
        ...markdownStyles.bullet_list,
      },
      ordered_list: {
        ...markdownStyles.ordered_list,
      },
      list_item: {
        ...markdownStyles.list_item,
      },
      bullet_list_content: {
        ...markdownStyles.bullet_list_content,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        textTransform: textTransformValue,
      },
      blockquote: {
        ...markdownStyles.blockquote,
      },
      strong: {
        ...markdownStyles.strong,
        fontFamily: getFontFamily(),
        fontWeight: 'bold',
      },
      em: {
        ...markdownStyles.em,
        fontFamily: getFontFamily(),
        fontStyle: italicFontStyle,
      },
    };

    // Add all necessary styles with proper type assertions
    const stylesWithAllProps = {
      ...customMarkdownStyles,
      ordered_list_text: {
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        color: theme.colors.text,
        textTransform: textTransformValue,
      },
      blockquote_content: { // This is likely the correct key for blockquote text
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        color: theme.colors.text,
        fontStyle: italicFontStyle,
        textTransform: textTransformValue,
      },
    };

    return (
      <Markdown style={stylesWithAllProps}>
        {content}
      </Markdown>
    );
  };

  const skipBackward = async () => {
    // Skip back 15 seconds, but no lower than 0
    const newTime = Math.max(0, currentTime - 15);
    
    try {
      // Check if the useAudioPlayback hook now exposes a seek method
      if (typeof seek === 'function') {
        await seek(newTime);
        console.log(`[Audio] Skipped backward to ${newTime}s`);
      } else {
        // Fallback to the alert for now
        Alert.alert("Skip Backward", "Would skip back 15 seconds (to " + newTime.toFixed(0) + "s)");
      }
    } catch (error) {
      console.error('[Audio] Skip backward error:', error);
      Alert.alert("Error", "Failed to skip backward");
    }
  };

  const skipForward = async () => {
    // Skip forward 15 seconds
    const newTime = currentTime + 15;
    
    try {
      // Check if the useAudioPlayback hook now exposes a seek method
      if (typeof seek === 'function') {
        await seek(newTime);
        console.log(`[Audio] Skipped forward to ${newTime}s`);
      } else {
        // Fallback to the alert for now
        Alert.alert("Skip Forward", "Would skip forward 15 seconds (to " + newTime.toFixed(0) + "s)");
      }
    } catch (error) {
      console.error('[Audio] Skip forward error:', error);
      Alert.alert("Error", "Failed to skip forward");
    }
  };

  const handleTranslatePress = () => {
    setShowSettingsSheet(false);
    // Show a toast message
    setToastMessage("Translation feature coming soon!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleChangeFontPress = () => {
    setShowSettingsSheet(false);
    
    // Open the font selection sheet instead of showing toast
    setTimeout(() => {
      setFontSheetVisible(true);
    }, 300);
  };

  const handleFontChange = (newSettings: FontSettings) => {
    setFontSettings(newSettings);
  };

  const handleLanguagePress = () => {
    setShowSettingsSheet(false);
    // Show a toast message for now
    setToastMessage("Language settings coming soon!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  useEffect(() => {
    console.log('Folder select modal visible:', folderSelectVisible);
  }, [folderSelectVisible]);

  // Create a handler for the back button in the font sheet
  const handleFontSheetBack = () => {
    setFontSheetVisible(false);
    
    // Wait for the font sheet to close, then open the settings sheet
    setTimeout(() => {
      setShowSettingsSheet(true);
    }, 300);
  };

  if (!route.params?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <ChevronLeft color={theme.colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Invalid study set ID</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading study set...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!studySet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <ChevronLeft color={theme.colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Study set not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(studySet.created_at).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const currentFolder = folders.find(f => f.id === studySet.folder_id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Keep the header always visible */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.headerButton}
          >
            <ChevronLeft color={theme.colors.text} size={20} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {studySet.title}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettingsSheet(true)}
          >
            <MoreVertical color={theme.colors.text} size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('Home', { openBottomSheet: true })}
          >
            <Plus color={theme.colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest of the content */}
      <ScrollView 
        style={{flex: 1}}
        contentContainerStyle={{paddingBottom: 150}}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        onScrollBeginDrag={() => setShowMoreOptions(false)}
      >
        <View style={{padding: theme.spacing.md}}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginVertical: theme.spacing.md,
            gap: theme.spacing.sm,
            position: 'relative',
          }}>
            <TouchableOpacity
              style={styles.card}
              onPress={handleFlashcardsPress}
            >
              <Text style={styles.cardTitle}>Learn</Text>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardCount}>
                  {studySet.flashcards?.length || 12} flipcards
                </Text>
              </View>
              
              <View style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 60,
                height: 65,
                overflow: 'visible',
                zIndex: 1,
              }}>
                {/* White card at the bottom - position unchanged */}
                <View style={{
                  position: 'absolute',
                  width: 45,
                  height: 55,
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  bottom: -8,
                  right: 20,
                  transform: [{ rotate: '-10deg' }],
                  zIndex: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                }} />
                
                {/* Yellow card in the middle - position unchanged */}
                <View style={{
                  position: 'absolute',
                  width: 45,
                  height: 55,
                  borderRadius: 6,
                  backgroundColor: '#E5C07B',
                  bottom: -3,
                  right: 10,
                  transform: [{ rotate: '-5deg' }],
                  zIndex: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                }} />
                
                {/* Blue card on top - now positioned slightly higher */}
                <View style={{
                  position: 'absolute',
                  width: 45,
                  height: 55,
                  borderRadius: 6,
                  backgroundColor: '#98BDF7',
                  bottom: 2, // Lifted up by 2 points (from 0 to 2)
                  right: 0,
                  transform: [{ rotate: '0deg' }],
                  zIndex: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={handleCreateQuiz}
            >
              <Text style={styles.cardTitle}>Practise</Text>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardCount}>
                  {(studySet as any).questions?.length || 15} questions
                </Text>
              </View>
              
              {/* Update the Practice card stacked cards - moved more to the right */}
              <View style={{
                position: 'absolute',
                top: '30%', // Keep high positioning
                right: -15, // Changed from 0 to -15 to move the whole stack more to the right
                width: 85, // Keep the increased width
                height: 65,
                overflow: 'visible',
                zIndex: 1,
                transform: [{ translateY: -25 }], // Keep the vertical centering adjustment
              }}>
                {/* Bottom card (furthest right and most cut off) */}
                <View style={{
                  position: 'absolute',
                  width: 90, // Keep the increased width
                  height: 40, // Keep the height
                  borderRadius: 6,
                  backgroundColor: '#252525',
                  bottom: -8,
                  right: -15, // Keep the right offset
                  transform: [{ rotate: '0deg' }], // No rotation
                  zIndex: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#343536',
                }} />
                
                {/* Middle card (middle position and partially cut off) */}
                <View style={{
                  position: 'absolute',
                  width: 90, // Keep the increased width
                  height: 40, // Keep the height
                  borderRadius: 6,
                  backgroundColor: '#2A2A2A',
                  bottom: -4,
                  right: -8, // Keep the right offset
                  transform: [{ rotate: '0deg' }], // No rotation
                  zIndex: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#343536',
                }} />
                
                {/* Top card (furthest left and least cut off) */}
                <View style={{
                  position: 'absolute',
                  width: 90, // Keep the increased width
                  height: 40, // Keep the height
                  borderRadius: 6,
                  backgroundColor: '#303030',
                  bottom: 0,
                  right: 0, // Keep at 0
                  transform: [{ rotate: '0deg' }], // No rotation
                  zIndex: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#343536',
                }}>
                  {/* Green circle with check mark - moved more to the left */}
                  <View style={{
                    position: 'absolute',
                    width: 20, // Keep small size
                    height: 20, // Keep small size
                    borderRadius: 10, // Half of width/height
                    backgroundColor: '#9AE6B4', // Light green color
                    top: 10, // Keep current vertical position
                    right: 60, // Changed from 45 to 60 to move more to the left
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#65D9A5', // Slightly darker green for border
                    zIndex: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 1,
                    elevation: 2,
                  }}>
                    {/* Checkmark */}
                    <Text style={{
                      color: '#1F1F1F', // Dark color for contrast
                      fontSize: 12,
                      fontWeight: 'bold',
                      lineHeight: 14,
                      textAlign: 'center',
                    }}>✓</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.contentSection}>
            {/* Listen button as a circle on the right side */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.md,
            }}>
              <Text style={{
                fontSize: theme.fontSizes.lg,
                fontFamily: theme.fonts.bold,
                color: theme.colors.text,
              }}>
                Key concepts
              </Text>
              
              <TouchableOpacity 
                style={styles.listenCircleButton}
                onPress={handleListenPress}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  isPlaying ? (
                    <Pause color="#FFFFFF" size={16} />
                  ) : (
                    <Play color="#FFFFFF" size={16} />
                  )
                )}
              </TouchableOpacity>
            </View>
            
            {/* Use the improved method to convert sections to markdown */}
            {renderMarkdownContent(convertSectionsToMarkdown(studySet.text_content.sections))}
          </View>
        </View>
      </ScrollView>

      {/* Add the audio player overlay */}
      {showAudioPlayer && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          zIndex: 9999,
          backgroundColor: '#1A1A1A',
          borderRadius: 30,
          margin: 10,
          marginTop: Platform.OS === 'ios' ? 50 : 10,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          justifyContent: 'space-between',
        }}>
          {/* Left side grouping - play button and timer */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {/* Play/Pause button */}
            <TouchableOpacity 
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={togglePlayback}
            >
              {isPlaying ? (
                <Pause color="#FFFFFF" size={28} />
              ) : (
                <Play color="#FFFFFF" size={28} />
              )}
            </TouchableOpacity>
            
            {/* Timer - now smaller and closer to play button */}
            <Text style={{
              color: '#FFF',
              fontSize: 13,
              fontFamily: theme.fonts.regular,
              marginLeft: 4,
            }}>
              {String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </Text>
          </View>
          
          {/* Right side controls - skip buttons and close */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {/* Skip backward 15s */}
            <TouchableOpacity 
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: "#FFF",
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 6,
              }}
              onPress={skipBackward}
            >
              <Rewind color="#FFFFFF" size={20} />
            </TouchableOpacity>
            
            {/* Skip forward 15s */}
            <TouchableOpacity 
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: "#FFF",
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
              onPress={skipForward}
            >
              <FastForward color="#FFFFFF" size={20} />
            </TouchableOpacity>
            
            {/* Close button */}
            <TouchableOpacity 
              style={{
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                if (isPlaying) togglePlayback();
                setShowAudioPlayer(false);
              }}
            >
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals and other elements */}
      {folderSelectVisible && (
        <FolderSelectModal
          visible={folderSelectVisible}
          onClose={() => setFolderSelectVisible(false)}
          onCreateNew={handleCreateNewFolder}
          folders={folders}
          selectedFolderId={studySet?.folder_id || null}
          onSelect={handleFolderSelect}
          onUpdateFolder={updateFolder}
        />
      )}

      {folderCreateVisible && (
        <FolderCreationModal
          visible={folderCreateVisible}
          onClose={() => setFolderCreateVisible(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      <StudySetSettingsSheet
        visible={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        onFolderPress={() => {
          setShowSettingsSheet(false);
          setTimeout(() => {
            setFolderSelectVisible(true);
          }, 300);
        }}
        onDeletePress={() => {
          setShowSettingsSheet(false);
          handleDeletePress();
        }}
        onTranslatePress={handleTranslatePress}
        onChangeFontPress={handleChangeFontPress}
        onLanguagePress={handleLanguagePress}
        hasFolderAssigned={!!studySet?.folder_id}
        folderName={currentFolder?.name || ''}
        folderColor={currentFolder?.color || '#888'}
        language={'English'}
        selectedFont={fontSettings.font}
      />

      <FontSelectionSheet
        visible={fontSheetVisible}
        onClose={() => setFontSheetVisible(false)}
        onBack={handleFontSheetBack}
        selectedFont={fontSettings.font}
        fontSize={fontSettings.size}
        isAllCaps={fontSettings.isAllCaps}
        onFontChange={handleFontChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    position: 'relative',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 0,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    paddingRight: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.xxl,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  optionButton: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  contentSection: {
    paddingVertical: theme.spacing.lg,
  },
  contentTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  listenCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    lineHeight: 24,
    padding: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerTitleText: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background02,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.xxl,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  folderText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
    color: theme.colors.background,
  },
  metaInfo: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metaLabel: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    width: 100,
  },
  metaValue: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    flex: 1,
  },
  folderValue: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  emptyFolderText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  heading1: {
    fontSize: theme.fontSizes.xl,
    fontFamily: theme.fonts.bold,
    marginVertical: theme.spacing.md,
  },
  heading2: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.semiBold,
    marginVertical: theme.spacing.sm,
  },
  listItem: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  
  definition: {
    marginVertical: theme.spacing.sm,
  },
  term: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  definitionText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: 0,
    flex: 1,
  },
  moreOptionsMenu: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: theme.colors.background01,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    padding: theme.spacing.sm,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  moreOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  moreOptionText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    marginLeft: theme.spacing.sm,
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
  errorText: {
    color: 'red',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    marginLeft: theme.spacing.xs,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    overflow: 'visible',
    position: 'relative',
    zIndex: 0,
  },
  card: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    minHeight: 120,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    width: '100%',
  },
  cardCount: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    opacity: 0.8,
    marginLeft: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9AE6B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#1F1F1F',
    fontSize: 18,
    fontWeight: 'bold',
  },
  practiseIndicator: {
    marginLeft: theme.spacing.md,
    alignItems: 'flex-end',
  },
  cardImageContainer: {
    position: 'absolute',
    right: -15,
    bottom: -25,
    zIndex: 1,
  },
  cardImage: {
    // No specific styles needed here as we're setting width/height directly on the SVG
  },
  stackedCardsContainer: {
    position: 'absolute',
    bottom: -35,
    right: -35,
    width: 90,
    height: 110,
    overflow: 'visible',
    zIndex: 1,
  },
  stackedCard: {
    position: 'absolute',
    width: 70,
    height: 90,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  cardBlue: {
    backgroundColor: '#98BDF7',
    bottom: 0,
    right: 0,
    transform: [{ rotate: '10deg' }],
    zIndex: 3,
  },
  cardYellow: {
    backgroundColor: '#E5C07B',
    bottom: 5,
    right: 5,
    transform: [{ rotate: '5deg' }],
    zIndex: 2,
  },
  cardWhite: {
    backgroundColor: '#FFFFFF',
    bottom: 10,
    right: 10,
    transform: [{ rotate: '0deg' }],
    zIndex: 1,
  },
  folderNameText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const markdownStyles: Record<string, TextStyle | ViewStyle> = {
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.3,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginBottom: 24,
    lineHeight: 27,
  },
  strong: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  em: {
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
    color: theme.colors.text,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    lineHeight: 24,
  },
  blockquote: {
    backgroundColor: theme.colors.background01,
    marginVertical: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  bullet_list: {
    paddingLeft: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  bullet_list_icon: {
    marginRight: theme.spacing.sm,
    color: theme.colors.text,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list: {
    paddingTop: theme.spacing.md,
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  ordered_list_icon: {
    marginRight: theme.spacing.xs,
    color: theme.colors.text,
    fontWeight: '500',
  },
  body: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    lineHeight: 24,
  }
};

