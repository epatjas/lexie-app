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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySet';
import { ChevronLeft, Play, Pause, MoreVertical, Plus, X, Rewind, FastForward } from 'lucide-react-native';
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
  
  const { isPlaying, currentTime, togglePlayback, error: audioError, isLoading: audioIsLoading, progress, seek } = useAudioPlayback({
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

  const handleListenPress = async () => {
    try {
      setShowAudioPlayer(true);
      await togglePlayback();
    } catch (err) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };
  
  const navigateToCards = () => {
    console.log('[StudySetScreen] navigateToCards called');
    
    // Type-safe content check
    if (!content) {
      console.log('[StudySetScreen] Content is null');
      return;
    }
    
    // Now we're sure content isn't null
    console.log('[StudySetScreen] Content type:',
      isHomeworkHelp(content) ? 'homework-help' : 
      isStudySet(content) ? 'study-set' : 'unknown type');
    
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
      
      // Create params
      const params = { 
        homeworkHelpId: id, 
        title: content.title,
        cards: content.homeworkHelp.concept_cards || []
      };
      
      // Add this debug log
      console.log('[StudySetScreen] Available routes on direct navigation:', 
        navigation.getState()?.routeNames || []);
      
      // Try direct navigation, which should work after we fix AppNavigator
      navigation.navigate('ConceptCardScreen', params);
    } else if (content && isStudySet(content)) {
      console.log('[StudySetScreen] Navigating to Flashcards with studySetId:', id);
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
            const cleanedItems = section.items.map(item => {
              return item.replace(/^\s*\d+\.\s*/, '');
            });
            return cleanedItems.map(item => `1. ${item}`).join('\n') + '\n\n';
          } else {
            const cleanedItems = section.items.map(item => {
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
    const textTransformValue = fontSettings.isAllCaps ? 'uppercase' as const : 'none' as const;
    const italicFontStyle = 'italic' as const;
    
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
      bullet_list_content: {
        ...markdownStyles.bullet_list_content,
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        textTransform: textTransformValue,
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

    const stylesWithAllProps = {
      ...customMarkdownStyles,
      ordered_list_text: {
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        color: theme.colors.text,
        textTransform: textTransformValue,
      },
      blockquote_content: {
        fontFamily: getFontFamily(),
        fontSize: fontSettings.size,
        color: theme.colors.text,
        fontStyle: italicFontStyle,
        textTransform: textTransformValue,
      },
    };

    return (
      <Markdown 
        style={stylesWithAllProps}
        rules={{
          bullet_list_item: (node, children, parent, styles) => {
            return (
              <View key={node.key} style={styles.list_item}>
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.text,
                  marginTop: 10,
                  marginRight: 6,
                }} />
                <View style={styles.bullet_list_content}>{children}</View>
              </View>
            );
          }
        }}
      >
        {content}
      </Markdown>
    );
  };
  
  // Determine card count using our helper function
  const cardCount = content ? getCardCountText(content) : 'Loading...';
  
  // Determine content type safely
  const contentIsHomeworkHelp = content ? isHomeworkHelp(content) : false;
  const contentIsStudySet = content ? isStudySet(content) : false;

  const currentFolder = content ? folders.find(f => f.id === content.folder_id) : undefined;

  // Fix the summary rendering with proper type guards
  const renderContent = () => {
    if (!content) return null;
    
    if (activeTab === 'summary' && hasSummary(content)) {
      return <Text style={styles.summaryText}>{getSummary(content)}</Text>;
    } else {
      return <View>
        {renderMarkdownContent(convertSectionsToMarkdown(content.text_content.sections))}
      </View>;
    }
  };

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
                        <Play color="#FFFFFF" size={16} />
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
                      style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
                      onPress={() => setActiveTab('summary')}
                    >
                      <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
                        Summary
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.tab, activeTab === 'original' && styles.activeTab]}
                      onPress={() => setActiveTab('original')}
                    >
                      <Text style={[styles.tabText, activeTab === 'original' && styles.activeTabText]}>
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
                        <Play color="#FFFFFF" size={16} />
                      )
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Content based on selected tab */}
                <View style={styles.tabContent}>
                  {content && renderContent()}
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
      {showAudioPlayer && (
        <View style={styles.audioPlayerOverlay}>
          <View style={styles.audioPlayerControls}>
            <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
              {isPlaying ? (
                <Pause color="#FFFFFF" size={28} />
              ) : (
                <Play color="#FFFFFF" size={28} />
              )}
            </TouchableOpacity>
            
            <Text style={styles.audioTimer}>
              {String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </Text>
          </View>
          
          <View style={styles.audioRightControls}>
            <TouchableOpacity style={styles.skipButton} onPress={skipBackward}>
              <Rewind color="#FFFFFF" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.skipButton} onPress={skipForward}>
              <FastForward color="#FFFFFF" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => {
              if (isPlaying) togglePlayback();
              setShowAudioPlayer(false);
            }}>
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

      <TouchableOpacity onPress={testNavigation}>
        <Text>Test Navigation</Text>
      </TouchableOpacity>
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
    marginBottom: theme.spacing.sm,
  },
  homeworkContent: {
    padding: theme.spacing.md,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  factText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  objectiveText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
});

// Markdown styles
const markdownStyles: MarkdownStylesObject = {
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
    paddingLeft: 0,
    marginVertical: theme.spacing.sm,
  },
  bullet_list_icon: {
    marginRight: 10,
    marginTop: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text,
  },
  bullet_list_content: {
    flex: 1,
    marginLeft: 0,
  },
  ordered_list: {
    paddingTop: theme.spacing.md,
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
};