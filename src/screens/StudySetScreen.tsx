import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  TextStyle,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySet';
import { ChevronLeft, Play, Pause, MoreVertical, Plus, X, Rewind, FastForward, Volume2, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useFolders } from '../hooks/useFolders';
import FolderSelectModal from '../components/FolderSelectModal';
import FolderCreationModal from '../components/FolderCreationModal';
import Markdown from 'react-native-markdown-display';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSettings } from '../types/fontSettings';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import StudySetSettingsSheet from '../components/StudySetSettingsSheet';
import FontSelectionSheet from '../components/FontSelectionSheet';
import { getDatabase } from '../services/Database';
import { StudySet, HomeworkHelp } from '../types/types';
import { getStudySet } from '../services/Database';
import { isStudySet, isHomeworkHelp, getCardCountText, hasSummary, getSummary } from '../utils/contentTypeHelpers';
import * as NavigationService from '../navigation/NavigationService';
import { useAudio } from '../hooks/useAudio';
import AudioPlayer from '../components/AudioPlayer';
import { AntDesign } from '@expo/vector-icons';

type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;
type ContentType = 'study-set' | 'homework-help';

// Define markdown styles type
type MarkdownStylesObject = {
  [key: string]: any;
};

// Add interfaces for text sections
interface TextSection {
  type: 'heading' | 'paragraph' | 'list' | 'definition' | 'quote';
  level?: number;
  raw_text: string;
  items?: string[];
  style?: 'bullet' | 'numbered';
}

const FONT_SETTINGS_KEY = 'global_font_settings';

export default function StudySetScreen({ route, navigation }: StudySetScreenProps): React.JSX.Element {
  const { id, contentType = 'study-set' } = route.params;
  const navigationNative = useNavigation<NavigationProp<RootStackParamList>>();
  
  // State variables
  const [folderSelectVisible, setFolderSelectVisible] = useState(false);
  const [folderCreateVisible, setFolderCreateVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Coming soon");
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    font: 'Standard',
    size: 16,
    isAllCaps: false
  });
  const [fontSheetVisible, setFontSheetVisible] = useState(false);
  const [content, setContent] = useState<StudySet | HomeworkHelp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const [selectedTab, setSelectedTab] = useState('summary');
  const { playAudio, pauseAudio, isPlaying, isLoading: audioIsLoading } = useAudio();

  // Hooks
  const { folders, addFolder, assignStudySetToFolder, updateFolder } = useFolders();
  const { studySet, refreshStudySet, loading, deleteStudySet } = useStudySetDetails(id);
  
  const constructAudioText = (studySet: any): string => {
    if (!studySet) return '';
    
    let audioText = `${studySet.title}, , , \u2003 \u2003 \u2003`;
    
    // Handle study set content
    if (studySet.text_content?.sections) {
      studySet.text_content.sections.forEach((section: any) => {
        if (section.type === 'heading') {
          audioText += `\u2003 \u2003 \u2003 ${section.raw_text}, , , \u2003 \u2003 \u2003`;
        } else if (section.type === 'paragraph' || section.type === 'definition') {
          audioText += `${section.raw_text}, , \u2003 \u2003`;
        } else if (section.type === 'list' && Array.isArray(section.items)) {
          audioText += section.items.map((item: string): string => 
            `${item}, \u2003`
          ).join('') + ', \u2003 \u2003';
        }
      });
    }
    
    // Handle homework help content
    if (isHomeworkHelp(studySet) && studySet.homeworkHelp) {
      // Add assignment information if available
      if (studySet.homeworkHelp.assignment) {
        if (studySet.homeworkHelp.assignment.objective) {
          audioText += `Objective: ${studySet.homeworkHelp.assignment.objective}, , , \u2003 \u2003 \u2003`;
        }
        
        if (Array.isArray(studySet.homeworkHelp.assignment.facts)) {
          audioText += `Important facts: \u2003 \u2003`;
          studySet.homeworkHelp.assignment.facts.forEach((fact: string) => {
            audioText += `${fact}, \u2003 \u2003`;
          });
        }
      }
      
      // Add concept cards content if available
      if (Array.isArray(studySet.homeworkHelp.concept_cards) && studySet.homeworkHelp.concept_cards.length > 0) {
        audioText += `Concept cards: \u2003 \u2003 \u2003`;
        studySet.homeworkHelp.concept_cards.forEach((card: any, index: number) => {
          audioText += `Card ${index + 1}: ${card.title}, , \u2003`;
          if (card.explanation) {
            audioText += `${card.explanation}, \u2003 \u2003`;
          }
        });
      }
    }

    return audioText;
  };
  
  const { currentTime, seek } = useAudioPlayback({
    text: studySet ? constructAudioText(studySet) : '',
  });
  
  // Effects
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
  
  // Declare this function outside useEffect so it can be referenced elsewhere
  const loadStudySet = async () => {
    setIsLoading(true);
    try {
      const studySet = await getStudySet(id);
      setContent(studySet);
      console.log('Content type from database:', studySet.contentType || 'study-set');
    } catch (error) {
      console.error('Failed to load study set:', error);
      setError('Failed to load study set.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Then in useEffect, just call the function
  useEffect(() => {
    loadStudySet();
  }, [id]);
  
  useEffect(() => {
    if (content) {
      console.log("[StudySet] Content loaded:", {
        id: content.id,
        title: content.title,
        type: content.contentType,
        hasHomeworkHelp: !!(content as any).homeworkHelp,
        homeworkHelpKeys: (content as any).homeworkHelp ? Object.keys((content as any).homeworkHelp) : []
      });
    }
  }, [content]);
  
  useEffect(() => {
    console.log("[StudySet] Content loaded with type:", {
      contentTypeParam: contentType,
      contentTypeFromData: content?.contentType,
      hasHomeworkHelp: !!(content as HomeworkHelp)?.homeworkHelp,
      hasFlashcards: !!(content as StudySet)?.flashcards
    });
  }, [content, contentType]);
  
  useEffect(() => {
    if (content && isHomeworkHelp(content)) {
      console.log('Loaded homework help with', 
        content.homeworkHelp.concept_cards ? 
        `${content.homeworkHelp.concept_cards.length} concept cards` : 
        'no concept cards');
      
      if (content.homeworkHelp.concept_cards?.length > 0) {
        console.log('First concept card:', content.homeworkHelp.concept_cards[0]);
      }
    }
  }, [content]);
  
  // Handlers
  const handleCreateFolder = async (name: string, color: string) => {
    try {
      const newFolder = await addFolder(name, color);
      if (id && newFolder) {
        await assignStudySetToFolder(id, newFolder.id);
        await refreshStudySet();
      }
      setFolderCreateVisible(false);
      setFolderSelectVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    try {
      if (id) {
        await assignStudySetToFolder(id, folderId);
        await refreshStudySet();
      }
      setFolderSelectVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign study set to folder');
    }
  };

  const handleCreateNewFolder = () => {
    setFolderCreateVisible(true);
  };

  const handleCreateQuiz = () => {
    if (id) {
      navigation.navigate('Quiz', {
        quiz: [],
        studySetId: id
      });
    }
  };

  const handleFlashcardsPress = () => {
    if (id) {
      navigationNative.navigate('Flashcards', { studySetId: id });
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
        { text: "Peruuta", style: "cancel" },
        {
          text: "Poista",
          onPress: async () => {
            try {
              if (!id) return;
              await deleteStudySet(id);
              navigationNative.navigate('Home', { refresh: true } as const);
            } catch (error) {
              Alert.alert('Virhe', 'Harjoittelusetin poistaminen epäonnistui');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleListenPress = () => {
    if (content) {
      setShowAudioPlayer(true);
    } else {
      // Maybe show an error message
      Alert.alert('Error', 'No content available to play');
    }
  };

  const handleCloseAudio = () => {
    setShowAudioPlayer(false);
  };
  
  const navigateToCards = () => {
    console.log('[StudySetScreen] navigateToCards called');
    
    if (!content) {
      console.log('[StudySetScreen] Content is null');
      return;
    }
    
    // Store font settings in AsyncStorage right before navigation 
    // This will be available to any screen that needs it
    AsyncStorage.setItem(FONT_SETTINGS_KEY, JSON.stringify(fontSettings))
      .catch(err => console.error('Failed to store font settings:', err));
    
    if (isHomeworkHelp(content)) {
      console.log('[StudySetScreen] HomeworkHelp content details:');
      console.log('- ID:', id);
      console.log('- Title:', content.title);
      console.log('- Has concept cards:', !!content.homeworkHelp.concept_cards);
      console.log('- Number of cards:', content.homeworkHelp.concept_cards?.length || 0);
      
      if (content.homeworkHelp.concept_cards && content.homeworkHelp.concept_cards.length > 0) {
        console.log('- First card sample:', JSON.stringify(content.homeworkHelp.concept_cards[0]));
      }
      
      if (!content.homeworkHelp.concept_cards || content.homeworkHelp.concept_cards.length === 0) {
        console.log('[StudySetScreen] No concept cards available, showing alert');
        Alert.alert(
          'No Cards Available',
          'There are no concept cards available for this content.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
        );
        return;
      }
      
      // Navigate with only the allowed parameters for ConceptCardScreen
      navigation.navigate('ConceptCardScreen', {
        homeworkHelpId: id, 
        title: content.title,
        cards: content.homeworkHelp.concept_cards || []
      });
    } else if (content && isStudySet(content)) {
      console.log('[StudySetScreen] Navigating to Flashcards with studySetId:', id);
      
      // Type-safe navigation for Flashcards
      navigation.navigate('Flashcards', {
        studySetId: id,
        title: content.title,
        flashcards: content.flashcards || []
      });
    } else {
      console.error('[StudySetScreen] Cannot navigate - invalid content type or null content');
    }
  };
  
  const skipBackward = async () => {
    const newTime = Math.max(0, currentTime - 15);
    if (typeof seek === 'function') {
      await seek(newTime);
    }
  };

  const skipForward = async () => {
    const newTime = currentTime + 15;
    if (typeof seek === 'function') {
      await seek(newTime);
    }
  };
  
  const handleTranslatePress = () => {
    setShowSettingsSheet(false);
    setToastMessage("Translation feature coming soon!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleChangeFontPress = () => {
    setShowSettingsSheet(false);
    setTimeout(() => {
      setFontSheetVisible(true);
    }, 300);
  };

  const handleFontChange = (newSettings: FontSettings) => {
    setFontSettings(newSettings);
  };

  const handleLanguagePress = () => {
    setShowSettingsSheet(false);
    setToastMessage("Language settings coming soon!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  
  const handleFontSheetBack = () => {
    setFontSheetVisible(false);
    setTimeout(() => {
      setShowSettingsSheet(true);
    }, 300);
  };
  
  // Helper functions
  const getFontFamily = () => {
    switch (fontSettings.font) {
      case 'Reading': return 'Georgia';
      case 'Dyslexia-friendly': return 'OpenDyslexic';
      case 'High-visibility': return 'AtkinsonHyperlegible';
      case 'Monospaced': return 'IBMPlexMono';
      default: return theme.fonts.regular;
    }
  };

  const convertSectionsToMarkdown = (sections: TextSection[]): string => {
    if (!sections || !Array.isArray(sections)) return '';
    
    return sections.map(section => {
      switch (section.type) {
        case 'heading':
          const headingMarker = '#'.repeat(section.level || 1);
          return `${headingMarker} ${section.raw_text}\n\n`;
          
        case 'paragraph':
          return `${section.raw_text}\n\n`;
          
        case 'list':
          if (!section.items || !Array.isArray(section.items)) return '';
          
          if (section.style === 'numbered') {
            return section.items.map((item, index) => {
              const cleanItem = item.replace(/^\s*\d+\.\s*/, '');
              return `${index + 1}. ${cleanItem}`;
            }).join('\n') + '\n\n';
          } else {
            return section.items.map(item => {
              const cleanItem = item.replace(/^\s*[•*-]\s*/, '');
              return `* ${cleanItem}`;
            }).join('\n') + '\n\n';
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

  const getMarkdownStyles = (): MarkdownStylesObject => {
    const fontFamily = getFontFamily();
    const fontSize = fontSettings.size;
    const textTransform = fontSettings.isAllCaps ? 'uppercase' : 'none';
    
    return {
      // Base text style applied to all elements
      body: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: theme.colors.text,
        lineHeight: fontSize * 1.5,
      },
      // Headings
      heading1: {
        fontSize: fontSize + 6,
        fontFamily: fontFamily,
        fontWeight: 'regular',
        color: theme.colors.primary,
        marginTop: 24,
        marginBottom: 8,
        textTransform: textTransform,
      },
      heading2: {
        fontSize: fontSize + 2,
        fontFamily: fontFamily,
        fontWeight: 'medium',
        color: theme.colors.primary,
        marginTop: 16,
        marginBottom: 8,
        textTransform: textTransform,
      },
      heading3: {
        fontSize: fontSize + 4,
        fontFamily: fontFamily,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 8,
        textTransform: textTransform,
      },
      // Paragraphs
      paragraph: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: theme.colors.text,
        marginBottom: 16,
        lineHeight: 26,
        textTransform: textTransform,
      },
      // Lists
      bullet_list: {
        marginBottom: 16,
      },
      ordered_list: {
        marginBottom: 16,
      },
      list_item: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: theme.colors.text,
        marginBottom: 8,
        flexDirection: 'row',
        textTransform: textTransform,
      },
      // Bold text
      strong: {
        fontWeight: 'bold',
        fontFamily: fontFamily,
      },
      // Other elements as needed
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 16,
        marginLeft: 0,
        marginBottom: 16,
      },
    };
  };

  const renderContent = () => {
    if (!content) return null;
    
    const markdownStyles = getMarkdownStyles();
    
    if (selectedTab === 'summary' && hasSummary(content)) {
      const summary = getSummary(content);
      console.log('Rendering summary markdown with proper component');
      
      return (
        <Markdown style={markdownStyles}>
          {summary}
        </Markdown>
      );
    } else {
      const originalText = convertSectionsToMarkdown(content.text_content.sections);
      console.log('Rendering original text markdown with proper component');
      
      return (
        <Markdown style={markdownStyles}>
          {originalText}
        </Markdown>
      );
    }
  };
  
  // Determine card count using our helper function
  const cardCount = content ? getCardCountText(content) : 'Loading...';
  
  // Determine content type safely
  const contentIsHomeworkHelp = content ? isHomeworkHelp(content) : false;
  const contentIsStudySet = content ? isStudySet(content) : false;

  const currentFolder = content ? folders.find(f => f.id === content.folder_id) : undefined;

  // Add this diagnostic function
  const checkNavigator = () => {
    // @ts-ignore - temporary debugging code
    const routes = navigation.getState()?.routeNames || [];
    console.log('Available routes:', routes);
    console.log('ConceptCardScreen in routes:', routes.includes('ConceptCardScreen'));
  };

  // Call this from a useEffect or button press
  useEffect(() => {
    checkNavigator();
  }, []);

  const testNavigation = () => {
    console.log('Available screens:', Object.keys(navigationNative.getState().routeNames || []));
    console.log('Testing navigation to ConceptCardScreen');
    
    // Try navigating with minimal parameters
    navigation.navigate('ConceptCardScreen', {
      homeworkHelpId: 'test',
      title: 'Test Navigation',
      cards: [{ card_number: 1, title: 'Test', explanation: 'Test', hint: 'Test' }]
    });
  };

  // Add this helper function near your other style helper functions
  const getTextStyle = (baseStyle: any) => {
    const textTransformValue = fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const;
    
    return {
      ...baseStyle,
      fontFamily: getFontFamily(),
      fontSize: baseStyle.fontSize ? 
        (baseStyle.fontSize - theme.fontSizes.md) + fontSettings.size : 
        fontSettings.size,
      textTransform: textTransformValue,
    };
  };

  // Near the top of your component 
  const listStyles = {
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
      marginTop: 10,
      marginRight: 8,
    },
    number: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      marginRight: 8,
      marginTop: 2,
    },
    spacing: {
      item: theme.spacing.sm,  // Space between list items
    }
  };

  // Add this near your other configuration
  const markdownRules = {
    bullet_list: {
      marginLeft: 16,
    },
    ordered_list: {
      marginLeft: 16,
    },
    bullet_list_icon: () => {
      return (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.primary,
            marginTop: 10,
            marginRight: 10,
          }}
        />
      );
    },
    // You can customize other rules here
  };

  // Add this function for handling feedback
  const handleFeedback = async (isPositive: boolean) => {
    if (!content || feedbackSubmitted) return;
    
    try {
      // Store feedback in AsyncStorage
      const feedbackData = {
        studySetId: id,
        contentType: content.contentType,
        isPositive,
        timestamp: new Date().toISOString(),
      };
      
      // Get existing feedback data or initialize empty array
      const existingDataJson = await AsyncStorage.getItem('content_feedback') || '[]';
      const existingData = JSON.parse(existingDataJson);
      
      // Add new feedback and save back to AsyncStorage
      existingData.push(feedbackData);
      await AsyncStorage.setItem('content_feedback', JSON.stringify(existingData));
      
      // Update state and show toast
      setFeedbackSubmitted(true);
      setShowFeedbackToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowFeedbackToast(false);
      }, 5000); // Keep toast visible a bit longer
      
      console.log('Feedback submitted:', feedbackData);
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.headerButton}
          >
            <ChevronLeft color={theme.colors.text} size={20} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {content ? content.title : 'Loading...'}
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
            onPress={() => navigationNative.navigate('Home', { openBottomSheet: true })}
          >
            <Plus color={theme.colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content conditionally rendered based on loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setIsLoading(true);
            setError(null);
            // Reload the content
            loadStudySet();
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : content ? (
        <ScrollView 
          style={{flex: 1}}
          contentContainerStyle={{paddingBottom: 150}}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          onScrollBeginDrag={() => setShowMoreOptions(false)}
        >
          <View style={{padding: theme.spacing.md}}>
            {/* Introduction - use type guard for proper access */}
            <Text style={styles.introText}>
              {content.introduction || "I analyzed your content. Here's some material to help you master this subject."}
            </Text>

            {/* Conditional rendering based on content type */}
            {contentIsHomeworkHelp ? (
              // HOMEWORK HELP UI
              <>
                {/* Just the Learn card */}
                <View style={{
                  flexDirection: 'row',
                  marginVertical: theme.spacing.md,
                  position: 'relative',
                }}>
                  <TouchableOpacity
                    style={[styles.card, {flex: 1}]}
                    onPress={navigateToCards}
                  >
                    <Text style={styles.cardTitle}>Learn</Text>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardCount}>
                        {content && isHomeworkHelp(content) && content.homeworkHelp?.concept_cards?.length > 0 
                          ? `${content.homeworkHelp.concept_cards.length} cards` 
                          : 'No cards'}
                      </Text>
                    </View>
                    <View style={styles.stackedCardsContainer}>
                      <View style={[styles.stackedCard, styles.cardWhite]} />
                      <View style={[styles.stackedCard, styles.cardYellow]} />
                      <View style={[styles.stackedCard, styles.cardBlue]} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Assignment section with audio button */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginVertical: theme.spacing.md,
                }}>
                  <Text style={getTextStyle(styles.assignmentTitle)}>Assignment</Text>
                  
                  {/* Add the audio button here */}
                  <TouchableOpacity 
                    style={styles.listenCircleButton}
                    onPress={handleListenPress}
                    disabled={audioIsLoading}
                  >
                    {audioIsLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.text} />
                    ) : (
                      isPlaying ? (
                        <Pause color="#FFFFFF" size={16} />
                      ) : (
                        <Volume2 color="#FFFFFF" size={16} />
                      )
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Display homework help content with applied font settings */}
                <View style={styles.homeworkContent}>
                  {/* Facts list with applied font settings */}
                  {content && isHomeworkHelp(content) && content.homeworkHelp?.assignment?.facts?.map((fact, index) => (
                    <View key={index} style={styles.factItem}>
                      <Text style={getTextStyle(styles.bulletPoint)}>•</Text>
                      <Text style={getTextStyle(styles.factText)}>{fact}</Text>
                    </View>
                  ))}
                  
                  {/* Objective with applied font settings */}
                  {content && isHomeworkHelp(content) && content.homeworkHelp?.assignment?.objective && (
                    <Text style={getTextStyle(styles.objectiveText)}>
                      {content.homeworkHelp.assignment.objective}
                    </Text>
                  )}
                </View>

                {/* Feedback section - updated to be left-aligned and closer to content */}
                <View style={styles.feedbackContainer}>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity 
                      style={styles.feedbackButton} 
                      onPress={() => handleFeedback(true)}
                      disabled={feedbackSubmitted}
                    >
                      <ThumbsUp 
                        color={theme.colors.textSecondary}
                        size={20} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.feedbackButton} 
                      onPress={() => handleFeedback(false)}
                      disabled={feedbackSubmitted}
                    >
                      <ThumbsDown 
                        color={theme.colors.textSecondary}
                        size={20} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              // STUDY SET UI
              <>
                {/* Learn and Practice cards */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginVertical: theme.spacing.md,
                  gap: theme.spacing.sm,
                  position: 'relative',
                }}>
                  {/* Learn card */}
                  <TouchableOpacity
                    style={styles.card}
                    onPress={navigateToCards}
                  >
                    <Text style={styles.cardTitle}>Learn</Text>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardCount}>
                        {content && isStudySet(content) && content.flashcards?.length > 0 
                          ? `${content.flashcards.length} cards` 
                          : 'No cards'}
                      </Text>
                    </View>
                    <View style={styles.stackedCardsContainer}>
                      <View style={[styles.stackedCard, styles.cardWhite]} />
                      <View style={[styles.stackedCard, styles.cardYellow]} />
                      <View style={[styles.stackedCard, styles.cardBlue]} />
                    </View>
                  </TouchableOpacity>

                  {/* Practice card */}
                  <TouchableOpacity
                    style={styles.card}
                    onPress={handleCreateQuiz}
                  >
                    <Text style={styles.cardTitle}>Practise</Text>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardCount}>
                        {content && isStudySet(content) && content.quiz?.length > 0 
                          ? `${content.quiz.length} questions` 
                          : 'No questions'}
                      </Text>
                    </View>
                    {/* Card decoration */}
                    <View style={styles.practiceCardsContainer}>
                      <View style={styles.practiceCard1} />
                      <View style={styles.practiceCard2} />
                      <View style={styles.practiceCard3}>
                        <View style={styles.checkCircle}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Tabs for Summary and Original Text */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginVertical: theme.spacing.md,
                }}>
                  <View style={styles.tabContainer}>
                    <TouchableOpacity 
                      style={[styles.tab, selectedTab === 'summary' && styles.activeTab]}
                      onPress={() => setSelectedTab('summary')}
                    >
                      <Text style={[styles.tabText, selectedTab === 'summary' && styles.activeTabText]}>
                        Summary
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.tab, selectedTab === 'original' && styles.activeTab]}
                      onPress={() => setSelectedTab('original')}
                    >
                      <Text style={[styles.tabText, selectedTab === 'original' && styles.activeTabText]}>
                        Original text
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.listenCircleButton}
                    onPress={handleListenPress}
                    disabled={audioIsLoading}
                  >
                    {audioIsLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.text} />
                    ) : (
                      isPlaying ? (
                        <Pause color="#FFFFFF" size={16} />
                      ) : (
                        <Volume2 color="#FFFFFF" size={16} />
                      )
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Content based on selected tab */}
                <View style={styles.tabContent}>
                  {content && renderContent()}
                </View>

                {/* Feedback section - updated to be left-aligned and closer to content */}
                <View style={styles.feedbackContainer}>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity 
                      style={styles.feedbackButton} 
                      onPress={() => handleFeedback(true)}
                      disabled={feedbackSubmitted}
                    >
                      <ThumbsUp 
                        color={theme.colors.textSecondary}
                        size={20} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.feedbackButton} 
                      onPress={() => handleFeedback(false)}
                      disabled={feedbackSubmitted}
                    >
                      <ThumbsDown 
                        color={theme.colors.textSecondary}
                        size={20} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No content available</Text>
        </View>
      )}

      {/* Audio player overlay */}
      {showAudioPlayer && content && (
        <AudioPlayer 
          content={content}
          selectedTab={selectedTab}
          onClose={handleCloseAudio}
        />
      )}

      {/* Modals and other elements */}
      {folderSelectVisible && (
        <FolderSelectModal
          visible={folderSelectVisible}
          onClose={() => setFolderSelectVisible(false)}
          onCreateNew={handleCreateNewFolder}
          folders={folders}
          selectedFolderId={content?.folder_id || null}
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

      {/* Toast notification for feedback - updated design */}
      {showFeedbackToast && (
        <View style={styles.feedbackToast}>
          <View style={styles.closeToastButtonContainer}>
            <TouchableOpacity 
              style={styles.closeToastButton}
              onPress={() => setShowFeedbackToast(false)}
            >
              <X color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>
          <Text style={styles.feedbackToastText}>
            Thank you for your feedback!
          </Text>
        </View>
      )}

      {/* Original toast for other messages */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <StudySetSettingsSheet
        visible={showSettingsSheet}
        onClose={() => setShowSettingsSheet(false)}
        onFolderPress={() => {
          setShowSettingsSheet(false);
          setTimeout(() => { setFolderSelectVisible(true); }, 300);
        }}
        onDeletePress={() => {
          setShowSettingsSheet(false);
          handleDeletePress();
        }}
        onTranslatePress={handleTranslatePress}
        onChangeFontPress={handleChangeFontPress}
        onLanguagePress={handleLanguagePress}
        hasFolderAssigned={!!content?.folder_id}
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

// Consolidated styles
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  
  // Header
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    paddingRight: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: 0,
    flex: 1,
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
  
  // Content Text
  introText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  summaryText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    lineHeight: 26,
  },
  rawContentText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  loadingText: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
  },
  
  // Cards
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
  
  // Card decorations
  stackedCardsContainer: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 60,
    height: 65,
    overflow: 'visible',
    zIndex: 1,
  },
  stackedCard: {
    position: 'absolute',
    width: 45,
    height: 55,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cardWhite: {
    backgroundColor: '#FFFFFF',
    bottom: -8,
    right: 20,
    transform: [{ rotate: '-10deg' }],
    zIndex: 1,
  },
  cardYellow: {
    backgroundColor: '#E5C07B',
    bottom: -3,
    right: 10,
    transform: [{ rotate: '-5deg' }],
    zIndex: 2,
  },
  cardBlue: {
    backgroundColor: '#98BDF7',
    bottom: 2,
    right: 0,
    transform: [{ rotate: '0deg' }],
    zIndex: 3,
  },
  
  // Practice card styles
  practiceCardsContainer: {
    position: 'absolute',
    top: '30%',
    right: -15,
    width: 85,
    height: 65,
    overflow: 'visible',
    zIndex: 1,
    transform: [{ translateY: -25 }],
  },
  practiceCard1: {
    position: 'absolute',
    width: 90,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#252525',
    bottom: -8,
    right: -15,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#343536',
  },
  practiceCard2: {
    position: 'absolute',
    width: 90,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#2A2A2A',
    bottom: -4,
    right: -8,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#343536',
  },
  practiceCard3: {
    position: 'absolute',
    width: 90,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#303030',
    bottom: 0,
    right: 0,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#343536',
  },
  checkCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9AE6B4',
    top: 10,
    right: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#65D9A5',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  checkMark: {
    color: '#1F1F1F',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
    textAlign: 'center',
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    padding: 4,
    marginBottom: 8,
    width: 'auto',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: '#9E9E9E',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '500',
  },
  tabContent: {
    paddingTop: 0,
  },
  
  // Listen button
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
  
  // Audio player overlay
  audioPlayerOverlay: {
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
  },
  audioPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTimer: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginLeft: 4,
  },
  audioRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Misc UI elements
  retryButton: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  retryButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: 'white',
  },
  toast: {
    position: 'absolute',
    top: '10%',
    flexDirection: 'row',
    alignItems: 'center',
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
  assignmentTitle: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  homeworkContent: {
    padding: theme.spacing.xs,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  bulletPoint: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  factText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  objectiveText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  feedbackContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingLeft: theme.spacing.xs,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
  },
  feedbackButton: {
    padding: theme.spacing.xs / 2,
  },
  feedbackToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 60, 0.5)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackToastText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    flex: 1,
    textAlign: 'left',
    paddingLeft: 0,
    marginRight: 0,
  },
  closeToastButtonContainer: {
    marginRight: 4,
    marginLeft: -4,
  },
  closeToastButton: {
    padding: 5,
    backgroundColor: 'rgba(80, 80, 80, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
});