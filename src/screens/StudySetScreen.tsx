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
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  ActionSheetIOS,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySet';
import { ChevronLeft, Play, Pause, MoreVertical, Plus, X, Rewind, FastForward, Volume2, ThumbsUp, ThumbsDown, Mic, ArrowUp, Send } from 'lucide-react-native';
import { useFolders } from '../hooks/useFolders';
import FolderSelectModal from '../components/FolderSelectModal';
import FolderCreationModal from '../components/FolderCreationModal';
import Markdown from 'react-native-markdown-display';
import { useAudio } from '../hooks/useAudio';
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
import AudioPlayer from '../components/AudioPlayer';
import { sendChatMessage } from '../services/api';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n/LanguageContext'; // Ensure this is imported
import { Analytics, FeedbackType, FeatureType, EventType } from '../services/AnalyticsService';

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

// First, let's add a type definition for vocabulary data
// Add this near the top where other interfaces are defined
interface VocabularyItem {
  source_term: string;
  target_term: string;
}

interface LanguageInfo {
  detected: string[];
  source_language: string;
  target_language: string;
}

// Add this interface near your other interfaces at the top of the file
interface WithOriginalText {
  original_text?: string;
}

// Add this type guard function to safely check for original_text property
const hasOriginalText = (content: any): content is { original_text: string } => {
  return content && typeof content.original_text === 'string';
};

// Add this helper function to clean markdown syntax
const cleanMarkdownSyntax = (text: string): string => {
  if (!text) return '';
  
  return text
    // Replace bold syntax with plain text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Replace italic syntax with plain text
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Clean up any other markdown indicators
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .trim();
};

// Now update the parseTextTable function to clean the terms
const parseTextTable = (text: string): { 
  source_terms: string[],
  target_terms: string[],
  headers: [string, string] 
} | null => {
  if (!text) return null;
  
  // Split by lines and filter for only lines starting with |
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|'));
  
  console.log('Parsing table text:', { lineCount: lines.length, firstLine: lines[0] });
  
  // Need at least 2 lines (header + content)
  if (lines.length < 2) return null;
  
  // Process the header row
  const headerRow = lines[0];
  const headerCells = headerRow.split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0);
  
  // Default headers if we can't extract them
  const headers: [string, string] = headerCells.length >= 2 
    ? [headerCells[0], headerCells[1]]
    : ['Term', 'Definition'];
  
  // Skip header row and separator row (if it exists)
  const startIndex = lines.length > 1 && lines[1].includes('--') ? 2 : 1;
  
  // Process data rows
  const sourceTerms: string[] = [];
  const targetTerms: string[] = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const row = lines[i];
    const cells = row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    if (cells.length >= 2) {
      // Clean markdown syntax from the terms
      sourceTerms.push(cleanMarkdownSyntax(cells[0]));
      targetTerms.push(cleanMarkdownSyntax(cells[1]));
    }
  }
  
  // Only return valid data
  if (sourceTerms.length > 0 && targetTerms.length > 0) {
    console.log(`Successfully parsed ${sourceTerms.length} vocabulary terms from text table`);
    return {
      source_terms: sourceTerms,
      target_terms: targetTerms,
      headers
    };
  }
  
  console.log('Failed to parse any vocabulary terms from text');
  return null;
};

// Now completely replace the getVocabularyData function
const getVocabularyData = (content: any): { items: VocabularyItem[], headers?: [string, string] } | null => {
  if (!content) {
    console.log('getVocabularyData: content is null');
    return null;
  }
  
  // First try getting structured vocabulary data
  if (content.vocabulary_data && 
      Array.isArray(content.vocabulary_data) && 
      content.vocabulary_data.length > 0) {
    console.log('Found structured vocabulary_data array');
    return { items: content.vocabulary_data };
  }
  
  // Not finding structured data, try parsing from text
  let textToCheck = '';
  
  // Check original_text first
  if (hasOriginalText(content)) {
    textToCheck = content.original_text;
    console.log('Using original_text for parsing');
  } 
  // Then try raw_text
  else if (content.text_content && content.text_content.raw_text) {
    textToCheck = content.text_content.raw_text;
    console.log('Using text_content.raw_text for parsing');
  }
  
  // If we have text with table format, parse it into vocabulary items
  if (textToCheck && textToCheck.includes('|')) {
    console.log('Text contains pipe characters, attempting to parse table');
    const parsedTable = parseTextTable(textToCheck);
    
    if (parsedTable) {
      // Convert to vocabulary items format and preserve headers
      return {
        items: parsedTable.source_terms.map((term, index) => ({
          source_term: term,
          target_term: parsedTable.target_terms[index] || ''
        })),
        headers: parsedTable.headers
      };
    }
  }
  
  // Last resort: try to extract from the first section if it looks like vocabulary
  if (content.text_content?.sections && Array.isArray(content.text_content.sections)) {
    console.log('Trying to find vocabulary in text sections');
    
    // Get the raw text from all sections
    const allSectionsText = content.text_content.sections
      .map((section: any) => section.raw_text || '')
      .join('\n');
    
    if (allSectionsText.includes('|')) {
      console.log('Found pipe characters in sections text');
      const parsedTable = parseTextTable(allSectionsText);
      
      if (parsedTable) {
        // Convert to vocabulary items format and preserve headers
        return {
          items: parsedTable.source_terms.map((term, index) => ({
            source_term: term,
            target_term: parsedTable.target_terms[index] || ''
          })),
          headers: parsedTable.headers
        };
      }
    }
  }
  
  console.log('Failed to find any vocabulary data in content');
  return null;
};

// Similarly, let's add a helper for language information
const getLanguageInfo = (content: any): LanguageInfo | null => {
  if (!content || !content.languages) return null;
  
  if (content.languages?.source_language && content.languages?.target_language) {
    return content.languages as LanguageInfo;
  }
  
  return null;
};

const FONT_SETTINGS_KEY = 'global_font_settings';

// Add these helper functions near the top of the file
// This helps us identify what format the homework help is in
const isNewFormat = (content: HomeworkHelp): boolean => {
  return !!content?.homeworkHelp?.problem_summary;
};

const hasProblemSummary = (content: HomeworkHelp): boolean => {
  return !!content?.homeworkHelp?.problem_summary;
};

// Add this helper function after the imports
const getChatHistoryKey = (studySetId: string) => `chat_history_${studySetId}`;

// Add this helper function to detect vocabulary content
const isVocabularyContent = (content: any): boolean => {
  if (!content) return false;
  
  // Log detailed check results for debugging
  const checkResult = {
    hasOriginalText: false,
    hasRawText: false,
    hasTableMarkers: false,
    hasTableHeader: false,
    hasVocabularyData: false,
    hasVocabularyTables: false,
    contentType: content.contentType || 'unknown',
  };

  // Check original_text property
  if (hasOriginalText(content)) {
    checkResult.hasOriginalText = true;
    // Only check for table markers if there are multiple lines starting with |
    const lines = content.original_text.split('\n');
    const tableLineCount = lines.filter(line => line.trim().startsWith('|')).length;
    
    checkResult.hasTableMarkers = tableLineCount > 2; // At least 3 lines (header + divider + content)
    checkResult.hasTableHeader = content.original_text.includes('--|--');
    
    console.log('Original text table markers:', tableLineCount, 'table lines found');
  }

  // Also check text_content.raw_text property
  if (content.text_content && typeof content.text_content.raw_text === 'string') {
    checkResult.hasRawText = true;
    const lines = content.text_content.raw_text.split('\n');
    const tableLineCount = lines.filter(line => line.trim().startsWith('|')).length;
    
    if (tableLineCount > 2) {
      checkResult.hasTableMarkers = true;
      console.log('Raw text contains table markers:', tableLineCount, 'table lines found');
    }
  }

  // Check explicit vocabulary data
  checkResult.hasVocabularyData = !!(content.vocabulary_data && 
    Array.isArray(content.vocabulary_data) && 
    content.vocabulary_data.length > 0);

  checkResult.hasVocabularyTables = !!(content.vocabulary_tables && 
    Array.isArray(content.vocabulary_tables) && 
    content.vocabulary_tables.length > 0);

  // Check content_type property if available
  const explicitVocabularyType = content.content_type === 'vocabulary';

  // Enhanced decision logic - include table markers as a factor
  const decision = explicitVocabularyType || 
         checkResult.hasVocabularyData || 
         checkResult.hasVocabularyTables ||
         checkResult.hasTableMarkers;  // This is new - detect based on text format

  console.log('Vocabulary content check:', {
    ...checkResult,
    explicitVocabularyType,
    decision
  });

  return decision;
}

const cleanTextForSpeech = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove markdown headings
    .replace(/#{1,6}\s/g, '')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown bold/italic
    .replace(/[*_`~]/g, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Clean up punctuation spacing
    .replace(/\s*([.,!?])\s*/g, '$1 ')
    // Remove any remaining markdown symbols
    .replace(/[#>|-]/g, '')
    .trim();
};

// Add this new component near the top of the file
const VocabularyTable = ({ data }: { 
  data: { 
    source_terms: string[],
    target_terms: string[],
    headers: [string, string] 
  }
}) => {
  return (
    <View style={styles.vocabularyTable}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>{data.headers[0]}</Text>
        <Text style={styles.tableHeaderCell}>{data.headers[1]}</Text>
      </View>
      
      {/* Rows */}
      {data.source_terms.map((term, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.sourceTermCell]}>{term}</Text>
          <Text style={styles.tableCell}>{data.target_terms[index]}</Text>
        </View>
      ))}
    </View>
  );
};

export default function StudySetScreen({ route, navigation }: StudySetScreenProps): React.JSX.Element {
  const { t } = useTranslation(); // Add this near the top with other hooks
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
  const [activeTab, setActiveTab] = useState('original');
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const [selectedTab, setSelectedTab] = useState('original');
  const { 
    playAudio, 
    pauseAudio, 
    resumeAudio,
    seekAudio,
    isPlaying, 
    isLoading: audioIsLoading,
    position,
    duration,
    formattedPosition,
    formattedDuration
  } = useAudio();
  const [showDebugBorder, setShowDebugBorder] = useState(false); // Change to false
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<Array<{
    text: string, 
    timestamp: Date,
    role: 'user' | 'assistant'
  }>>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Add loading state for chat history
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  // Add this to your state variables (near the top where other states are defined)
  const [isLexieTyping, setIsLexieTyping] = useState(false);

  // Add this with your other state variables
  const [dotAnimations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  // Add this with your other state variables
  const spinValue = useRef(new Animated.Value(0)).current;

  // Add this to your state variables section
  const [messageFeedback, setMessageFeedback] = useState<Record<number, 'like' | 'dislike' | null>>({});

  // Add this to your state variables
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Add this to your state variables
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Hooks
  const { folders, addFolder, assignStudySetToFolder, updateFolder } = useFolders();
  const { studySet, refreshStudySet, loading, deleteStudySet } = useStudySetDetails(id);
  
  // Update the constructAudioText function
  const constructAudioText = (studySet: any): string => {
    if (!studySet) return '';
    
    console.log('[Audio] Starting text construction:', {
      contentType: studySet.contentType,
      selectedTab,
      hasTitle: !!studySet.title,
      hasSummary: hasSummary(studySet),
      hasSections: !!studySet.text_content?.sections,
      sectionCount: studySet.text_content?.sections?.length || 0
    });

    let audioText = `${studySet.title}. `;
    
    if (selectedTab === 'summary' && hasSummary(studySet)) {
      const summary = getSummary(studySet);
      audioText += cleanTextForSpeech(summary);
    } else if (studySet.text_content?.sections) {
      // Process all sections
      audioText += studySet.text_content.sections
        .map((section: TextSection) => {
          switch (section.type) {
            case 'heading':
              return `${section.raw_text}. `;
              
            case 'paragraph':
            case 'definition':
              return `${cleanTextForSpeech(section.raw_text)}. `;
              
            case 'list':
              if (!section.items?.length) return '';
              const listItems = section.items
                .map((item, index) => {
                  const cleanItem = item.replace(/^\s*[•*-]\s*/, '').trim();
                  return `${index + 1}. ${cleanItem}`;
                })
                .join('. ');
              return `${listItems}. `;
              
            default:
              return `${cleanTextForSpeech(section.raw_text)}. `;
          }
        })
        .join(' ');
    }

    // Add vocabulary content if present
    if (studySet.vocabulary_tables?.length > 0) {
      audioText += ' Vocabulary section. ';
      studySet.vocabulary_tables.forEach((table: any, tableIndex: number) => {
        if (tableIndex > 0) audioText += ' Next table. ';
        
        table.rows.forEach((row: any) => {
          audioText += `${row.term}. ${row.definition}. `;
        });
      });
    }

    // Clean up the text
    const cleanedText = audioText
      // Ensure proper sentence endings
      .replace(/([^.!?])\s*\n+\s*/g, '$1. ')
      // Clean up multiple periods
      .replace(/\.+/g, '.')
      // Clean up spaces
      .replace(/\s+/g, ' ')
      // Add pauses after sentences
      .replace(/([.!?])\s*/g, '$1 \u2003 ')
      .trim();

    console.log('[Audio] Text construction complete:', {
      originalLength: audioText.length,
      cleanedLength: cleanedText.length,
      preview: cleanedText.substring(0, 100) + '...',
      sections: cleanedText.split('\u2003').length
    });

    return cleanedText;
  };
  
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
      
      // Add detailed logging for homework help content
      if (studySet.contentType === 'homework-help') {
        const homeworkHelp = studySet as HomeworkHelp;
        console.log('Loaded HomeworkHelp data:', {
          id: homeworkHelp.id,
          title: homeworkHelp.title,
          format: homeworkHelp.homeworkHelp?.problem_summary ? 'NEW' : 'OLD',
          problemSummaryLength: homeworkHelp.homeworkHelp?.problem_summary?.length || 0,
          concept_cards: homeworkHelp.homeworkHelp?.concept_cards?.length || 0
        });
        
        // Log the first 200 characters of problem_summary if available
        if (homeworkHelp.homeworkHelp?.problem_summary) {
          console.log('Problem Summary (first 200 chars):',
            homeworkHelp.homeworkHelp.problem_summary.substring(0, 200) + 
            (homeworkHelp.homeworkHelp.problem_summary.length > 200 ? '...' : '')
          );
        }
      }
      
      console.log('Content type from database:', studySet.contentType || 'study-set');
    } catch (error) {
      console.error('Failed to load study set:', error);
      setError(t('studySet.loadError'));
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
      console.log('------------------------');
      console.log('[HomeworkHelp] Content loaded:', {
        id: content.id,
        title: content.title,
        contentType: content.contentType,
        isNewFormat: isNewFormat(content),
        hasCards: !!content.homeworkHelp.concept_cards,
        cardCount: content.homeworkHelp.concept_cards?.length || 0
      });
      
      // Log format-specific data
      if (isNewFormat(content)) {
        console.log('[HomeworkHelp] NEW FORMAT DATA:', {
          problem_type: content.homeworkHelp.problem_type,
          problem_summary: content.homeworkHelp.problem_summary,
          approach_guidance: content.homeworkHelp.approach_guidance,
          language: content.homeworkHelp.language
        });
      } else {
        console.log('[HomeworkHelp] OLD FORMAT DATA:', {
          type: content.homeworkHelp.type,
          subject_area: content.homeworkHelp.subject_area,
          assignmentFacts: content.homeworkHelp.assignment?.facts,
          objective: content.homeworkHelp.assignment?.objective
        });
      }
      
      // Log concept cards sample
      if (content.homeworkHelp.concept_cards?.length > 0) {
        console.log('[HomeworkHelp] First concept card:', {
          ...content.homeworkHelp.concept_cards[0],
          hintLength: content.homeworkHelp.concept_cards[0].hint.length
        });
        
        if (content.homeworkHelp.concept_cards.length > 1) {
          console.log('[HomeworkHelp] Second concept card:', {
            ...content.homeworkHelp.concept_cards[1],
            hintLength: content.homeworkHelp.concept_cards[1].hint.length
          });
        }
      }
      console.log('------------------------');
    }
  }, [content]);
  
  // Add this to useEffect to specifically log the three key fields we want to display
  useEffect(() => {
    if (content && isHomeworkHelp(content)) {
      // Check if all three main components are present
      console.log('[HomeworkHelp] Component Check:', {
        hasIntroduction: !!content.introduction,
        introductionLength: content.introduction?.length || 0,
        hasProblemSummary: !!content.homeworkHelp.problem_summary,
        problemSummaryLength: content.homeworkHelp.problem_summary?.length || 0, 
        hasApproachGuidance: !!content.homeworkHelp.approach_guidance,
        approachGuidanceLength: content.homeworkHelp.approach_guidance?.length || 0,
        conceptCardCount: content.homeworkHelp.concept_cards?.length || 0
      });
      
      // Show first bit of each
      if (content.introduction) {
        console.log('Introduction (first 50 chars):', content.introduction.substring(0, 50) + '...');
      }
      if (content.homeworkHelp.problem_summary) {
        console.log('Problem Summary (first 50 chars):', content.homeworkHelp.problem_summary.substring(0, 50) + '...');
      }
      if (content.homeworkHelp.approach_guidance) {
        console.log('Approach Guidance:', 
          Array.isArray(content.homeworkHelp.approach_guidance) 
            ? (content.homeworkHelp.approach_guidance[0]?.substring(0, 50) || '') + '...'
            : (content.homeworkHelp.approach_guidance?.substring(0, 50) || '') + '...'
        );
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
      Alert.alert(t('alerts.error'), t('alerts.folderCreateFailed'));
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
      Alert.alert(t('alerts.error'), t('alerts.assignToFolderFailed'));
    }
  };

  const handleCreateNewFolder = () => {
    setFolderCreateVisible(true);
  };

  const handleCreateQuiz = () => {
    if (id) {
      Analytics.logFeatureUse(FeatureType.QUIZ, {
        content_id: id,
        content_type: content?.contentType || 'study-set'
      });
      navigation.navigate('Quiz', {
        quiz: [],
        studySetId: id
      });
    }
  };

  const handleFlashcardsPress = () => {
    if (id) {
      Analytics.logFeatureUse(FeatureType.FLASHCARDS, {
        content_id: id,
        content_type: content?.contentType || 'study-set'
      });
      navigationNative.navigate('Flashcards', { studySetId: id });
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  const handleDeletePress = () => {
    Alert.alert(
      t('alerts.deleteStudySet'),
      t('alerts.deleteConfirmation'),
      [
        { text: t('alerts.cancel'), style: "cancel" },
        {
          text: t('alerts.delete'),
          onPress: async () => {
            try {
              if (!id) return;
              await deleteStudySet(id);
              navigationNative.navigate('Home', { refresh: true } as const);
            } catch (error) {
              Alert.alert(t('alerts.error'), t('alerts.deleteError'));
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Update the handleListenPress function
  const handleListenPress = async () => {
    if (!content) {
      Alert.alert(t('alerts.error'), t('studySet.noContentToPlay'));
      return;
    }

    try {
      // Just show the audio player - don't play audio directly
      setShowAudioPlayer(true);

      Analytics.logFeatureUse(FeatureType.AUDIO, {
        content_id: id,
        content_type: content.contentType || 'study-set',
        selectedTab,
      });
    } catch (error) {
      console.error('[Audio] Error preparing audio content:', error);
      Alert.alert(
        t('alerts.error'), 
        t('studySet.audioPreparationError')
      );
    }
  };


  // Add cleanup when audio player is closed
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
          t('alerts.noCardsAvailable'),
          t('alerts.noCardsForContent'),
          [{ text: t('alerts.ok'), onPress: () => console.log('OK Pressed') }]
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
    const newTime = Math.max(0, position - 15);
    if (seekAudio) {
      await seekAudio(newTime);
    }
  };

  const skipForward = async () => {
    const newTime = position + 15;
    if (seekAudio) {
      await seekAudio(newTime);
    }
  };
  
  const handleTranslatePress = () => {
    setShowSettingsSheet(false);
    setToastMessage(t('alerts.translationComingSoon'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleChangeFontPress = () => {
    Analytics.logFeatureUse(FeatureType.FONT_SELECTION);
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
    setToastMessage(t('alerts.languageComingSoon'));
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

  // Now let's fix the convertSectionsToMarkdown function to be type-safe
  const convertSectionsToMarkdown = (sections: TextSection[]): string => {
    if (!sections || !Array.isArray(sections)) return '';
    
    // Use our helper functions to safely extract data
    const vocabularyResult = getVocabularyData(content);
    const languageInfo = getLanguageInfo(content);
    
    // First process vocabulary data if present - with proper type safety
    if (vocabularyResult && vocabularyResult.items.length > 0) {
      // Get language info for table headers
      const sourceLanguage = languageInfo?.source_language || 'Source';
      const targetLanguage = languageInfo?.target_language || 'Target';
      
      // Create a markdown table from vocabulary data
      let vocabularyTable = `| ${sourceLanguage} | ${targetLanguage} |\n|------------|------------|\n`;
      
      vocabularyResult.items.forEach(item => {
        vocabularyTable += `| **${item.source_term}** | ${item.target_term} |\n`;
      });
      
      // Return the table as markdown
      return vocabularyTable + '\n\n' + sections.map(section => {
        // Process section content as before
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
    }
    
    // If no vocabulary data, just process sections as before
    return sections.map(section => {
      // Same section processing as above
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
        marginLeft: 16,
      },
      ordered_list: {
        marginBottom: 16,
        marginLeft: 16,
      },
      list_item: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: theme.colors.text,
        marginBottom: 8,
        flexDirection: 'row',
        textTransform: textTransform,
      },
      // Bold text - combine both strong styles into one
      strong: {
        fontWeight: 'bold',
        fontFamily: fontFamily,
        color: theme.colors.primary, // Make bold text stand out in tables
      },
      // Italic text
      emphasis: {
        fontStyle: 'italic',
        fontFamily: fontFamily,
        color: theme.colors.textSecondary, // Subtle color for pronunciations
      },
      // Other elements as needed
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 16,
        marginLeft: 0,
        marginBottom: 16,
      },
      
      // Add these table styles
      table: {
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.stroke,
        marginVertical: 16,
        borderRadius: 8,
        backgroundColor: 'transparent', // Changed from background02 to transparent
      },
      thead: {
        backgroundColor: theme.colors.background02, // Keep header background
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.stroke,
      },
      tbody: {
        backgroundColor: 'transparent',
      },
      th: {
        flex: 1, // Change from width to flex
        padding: 12,
        fontFamily: theme.fonts.medium,
        fontSize: fontSize,
        color: theme.colors.text,
      },
      tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.stroke,
      },
      td: {
        flex: 1, // Change from width to flex
        padding: 12,
        fontFamily: fontFamily,
        fontSize: fontSize,
        color: theme.colors.text,
      },
    };
  };

  const getProblemSummaryMarkdownStyles = () => {
    const fontFamily = getFontFamily();
    const fontSize = fontSettings.size;
    const textTransform = fontSettings.isAllCaps ? 'uppercase' : 'none';
    
    return {
      body: {
        color: theme.colors.text,
        fontFamily: fontFamily,
        fontSize: fontSize,
        lineHeight: Math.round(fontSize * 1.8),
      },
      paragraph: {
        marginBottom: 16,
        color: theme.colors.text,
        fontFamily: fontFamily,
        fontSize: fontSize,
        lineHeight: Math.round(fontSize * 1.8),
        textTransform: textTransform,
      },
      bullet_list: {
        marginBottom: 16,
      },
      ordered_list: {
        marginBottom: 16,
      },
      bullet_list_item: {
        marginBottom: 8,
      },
      ordered_list_item: {
        marginBottom: 8,
      },
      bullet_list_icon: {
        marginRight: 8,
      },
      // ... can include other styles as needed
    };
  };

  // Enhance the renderMarkdownProblemSummary function to be reusable
  const renderMarkdownContent = (text: string | undefined, styleOverrides: any = {}) => {
    if (!text) return null;
    
    // Convert basic newlines to markdown line breaks for better compatibility
    const formattedText = text
      // Add a blank line after each newline for proper paragraph breaks
      .replace(/\n/g, '\n\n')
      // Convert standalone bullet markers to proper markdown bullets
      .replace(/^[•-]\s/gm, '* ')
      // Ensure proper spacing for existing markdown bullets
      .replace(/^\*/gm, '* ')
      // Ensure proper spacing for numbered lists
      .replace(/^(\d+)[.)] /gm, '$1. ');
    
    // Merge base styles with any overrides
    const combinedStyles = {
      ...getProblemSummaryMarkdownStyles(),
      ...styleOverrides
    };
    
    return (
      <Markdown style={combinedStyles}>
        {formattedText}
      </Markdown>
    );
  };

  // Update the approach guidance styles
  const getApproachGuidanceMarkdownStyles = () => {
    const fontFamily = getFontFamily();
    const fontSize = 15; // Changed from fontSettings.size to fixed 15
    const textTransform = fontSettings.isAllCaps ? 'uppercase' : 'none';
    
    return {
      // Override specific styles for approach guidance
      paragraph: {
        marginBottom: 12,
        color: theme.colors.text,
        fontFamily: fontFamily,
        fontSize: fontSize,
        lineHeight: Math.round(fontSize * 1.8), // Increased line height for better readability
        textTransform: textTransform,
      },
      strong: {
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: fontFamily,
      },
      emphasis: {
        fontStyle: 'italic',
        color: theme.colors.text,
      },
      bullet_list_icon: {
        marginRight: 8,
        marginTop: 6,
      },
      bullet_list_item: {
        marginBottom: 8,
      },
      bullet_list_content: {
        flex: 1,
      }
    };
  };

  // Fix for duplicate 'markdownRules' declarations - create one comprehensive rule set
  // Add this after all helper functions but before the return statement
  const createMarkdownRules = () => {
    return {
      table: (node: any, children: React.ReactNode, parent: any, styles: any) => {
        return (
          <View key={`table-${node.key}`} style={styles.table}>
            {children}
          </View>
        );
      },
      thead: (node: any, children: React.ReactNode, parent: any, styles: any) => {
        return (
          <View key={`thead-${node.key}`} style={styles.thead}>
            {children}
          </View>
        );
      },
      tr: (node: any, children: React.ReactNode, parent: any, styles: any) => {
        return (
          <View key={`tr-${node.key}`} style={styles.tr}>
            {children}
          </View>
        );
      },
      td: (node: any, children: React.ReactNode, parent: any, styles: any) => {
        return (
          <View key={`td-${node.key}`} style={[styles.td, { flex: 1 }]}>
            {children}
          </View>
        );
      },
      th: (node: any, children: React.ReactNode, parent: any, styles: any) => {
        return (
          <View key={`th-${node.key}`} style={[styles.th, { flex: 1 }]}>
            {children}
          </View>
        );
      }
    };
  };

  // First, let's define an interface for vocabulary data
  interface VocabularyData {
    source_term: string;
    target_term: string;
  }

  // Update the type guard to check for vocabulary data
  const hasVocabularyData = (content: any): content is { vocabulary_data: VocabularyData[] } => {
    return content && Array.isArray(content.vocabulary_data) && content.vocabulary_data.length > 0;
  };

  // Add this helper function to parse vocabulary text
  const parseVocabularyText = (text: string): { source_terms: string[], target_terms: string[] } => {
    const source_terms: string[] = [];
    const target_terms: string[] = [];
    
    // Split text into lines and process each line
    const lines = text.split('\n');
    
    lines.forEach(line => {
      // Skip empty lines
      if (!line.trim()) return;
      
      // Look for patterns like "word /pronunciation/ translation"
      // or "word translation /pronunciation/"
      const parts = line.split('/');
      if (parts.length >= 2) {
        // Get the text before the first pronunciation guide
        let sourceTerm = parts[0].trim();
        
        // Find the translation after the last pronunciation guide
        let targetTerm = parts[parts.length - 1].trim();
        
        // If there's text between pronunciation guides, it's probably the translation
        if (parts.length > 2) {
          const middlePart = parts[1].split(' ').filter(p => p.trim()).pop() || '';
          if (middlePart) {
            targetTerm = middlePart + ' ' + targetTerm;
          }
        }
        
        // Clean up the terms
        sourceTerm = sourceTerm.replace(/\s+/g, ' ').trim();
        targetTerm = targetTerm.replace(/\s+/g, ' ').trim();
        
        if (sourceTerm && targetTerm) {
          source_terms.push(sourceTerm);
          target_terms.push(targetTerm);
        }
      }
    });
    
    return { source_terms, target_terms };
  };

  // Add this helper function to convert text_content.sections to markdown if available
  const getSectionsAsMarkdown = (content: any): string => {
    if (!content || !content.text_content || !content.text_content.sections) {
      return '';
    }
    
    // If sections array is empty, return empty string
    if (!Array.isArray(content.text_content.sections) || content.text_content.sections.length === 0) {
      return '';
    }
    
    console.log('Found sections:', content.text_content.sections.length);
    
    // Convert the sections to markdown
    return convertSectionsToMarkdown(content.text_content.sections);
  };

  // Update the renderContent function for the original tab
  const renderContent = () => {
    if (!content) return null;

    const markdownStyles = getMarkdownStyles();
    const rules = createMarkdownRules();
    
    // Handle different tabs correctly
    if (selectedTab === 'original') {
      // Original tab - could be raw text OR vocabulary
      
      // First check: Is this vocabulary content?
      const isVocabulary = isVocabularyContent(content);
      console.log(`Original tab: Rendering content as ${isVocabulary ? 'vocabulary' : 'regular text'}`);
      
      if (isVocabulary) {
        // If it's vocabulary content, render using vocabulary table
        return renderVocabularyContent();
      } else {
        // For non-vocabulary, try to use sections if available, fall back to raw_text
        const sectionsMarkdown = getSectionsAsMarkdown(content);
        
        // If we have sections content, use it
        if (sectionsMarkdown) {
          console.log('Using sections for original content');
          return (
            <Markdown style={markdownStyles} rules={rules}>
              {sectionsMarkdown}
            </Markdown>
          );
        }
        
        // Otherwise use raw text, applying some basic structure
        const rawText = content.text_content?.raw_text || 
                       (hasOriginalText(content) ? content.original_text : '');
        
        // Apply basic formatting to make important sections stand out
        const formattedText = formatRawText(rawText);
        
        return (
          <Markdown style={markdownStyles} rules={rules}>
            {formattedText}
          </Markdown>
        );
      }
    } else if (selectedTab === 'summary') {
      // Summary tab - ALWAYS renders summary as markdown, never as vocabulary
      console.log('Summary tab: Rendering summary content');
      
      // Log some debugging info about the summary
      if (content.summary) {
        console.log('Summary content detected:', {
          length: content.summary.length,
          preview: content.summary.substring(0, 50) + '...',
          hasMarkdown: content.summary.includes('#') || content.summary.includes('*')
        });
      } else {
        console.log('No summary content available');
      }
      
      return (
        <Markdown style={markdownStyles} rules={rules}>
          {content.summary || ''}
        </Markdown>
      );
    }
    
    // Fallback - shouldn't normally reach here
    return null;
  };

  // Add this helper to format raw text with basic markdown
  const formatRawText = (text: string): string => {
    if (!text) return '';
    
    // Split text into paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    // Process each paragraph
    return paragraphs.map((paragraph, index) => {
      // Check if this looks like a title (all caps, short, at the beginning)
      if (index === 0 && paragraph.length < 100 && paragraph === paragraph.toUpperCase()) {
        return `# ${paragraph}\n\n`;
      }
      
      // Check for important markers
      if (paragraph.startsWith('TÄRKEÄÄ') || paragraph.startsWith('HUOMAA')) {
        const marker = paragraph.split(' ')[0];
        const content = paragraph.substring(marker.length).trim();
        return `## ${marker}\n\n${content}\n\n`;
      }
      
      // Regular paragraph
      return `${paragraph}\n\n`;
    }).join('');
  };

  // Add a dedicated vocabulary rendering function
  const renderVocabularyContent = () => {
    if (!content) return null;
    
    const vocabularyResult = getVocabularyData(content);
    if (!vocabularyResult || !vocabularyResult.items || vocabularyResult.items.length === 0) {
      console.log('No vocabulary data available');
      return <Text style={styles.errorText}>No vocabulary data available</Text>;
    }
    
    const vocabularyData = vocabularyResult.items;
    console.log(`Rendering vocabulary table with ${vocabularyData.length} terms`);
    
    // First try to use headers from the parsed table
    let sourceHeader = vocabularyResult.headers?.[0];
    let targetHeader = vocabularyResult.headers?.[1];
    
    // If no headers from parsed table, try to get from languageInfo
    if (!sourceHeader || !targetHeader) {
      const languageInfo = getLanguageInfo(content);
      sourceHeader = languageInfo?.source_language || 'Term';
      targetHeader = languageInfo?.target_language || 'Definition';
    }
    
    console.log('Using table headers:', sourceHeader, targetHeader);
    
    // Extract terms for the table
    const source_terms = vocabularyData.map(item => item.source_term);
    const target_terms = vocabularyData.map(item => item.target_term);
    
    return (
      <View style={styles.vocabularyContainer}>
        <VocabularyTable 
          data={{
            source_terms,
            target_terms,
            headers: [sourceHeader, targetHeader]
          }}
        />
      </View>
    );
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
      // Log content feedback
      await Analytics.logContentFeedback(
        content.contentType || 'study-set',
        id,
        isPositive,
        {
          page: selectedTab,
          has_flashcards: content.contentType === 'study-set' && Array.isArray((content as StudySet).flashcards),
          has_quiz: content.contentType === 'study-set' && Array.isArray((content as StudySet).quiz),
        }
      );
      
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

  const logRenderedContent = () => {
    if (content && isHomeworkHelp(content)) {
      console.log('[HomeworkHelp] Rendering:', {
        format: isNewFormat(content) ? 'NEW' : 'OLD',
        showingSummary: isNewFormat(content),
        showingFacts: !isNewFormat(content) && !!content.homeworkHelp.assignment?.facts?.length,
        showingObjective: !isNewFormat(content) && !!content.homeworkHelp.assignment?.objective,
        cardCount: content.homeworkHelp.concept_cards?.length || 0
      });
    }
  }

  // Add this useEffect hook before the return statement
  useEffect(() => {
    if (content && isHomeworkHelp(content)) {
      logRenderedContent();
    }
  }, [content]);

  // Add at the beginning of the render function after const declarations
  // (just before the return statement)
  useEffect(() => {
    if (content && isHomeworkHelp(content) && isNewFormat(content)) {
      console.log('Homework Help Content Details:', {
        hasProblemSummary: !!content.homeworkHelp.problem_summary,
        problemSummaryLength: content.homeworkHelp.problem_summary?.length || 0,
        hasApproachGuidance: !!content.homeworkHelp.approach_guidance,
        approachGuidanceLength: content.homeworkHelp.approach_guidance?.length || 0,
        firstFewChars: content.homeworkHelp.problem_summary?.substring(0, 50) + '...'
      });
    }
  }, [content]);

  // Add this function to further improve paragraph spacing
  const formatProblemText = (text: string | undefined): React.ReactNode[] => {
    if (!text) return [];
    
    // Split text by double newlines (paragraphs)
    return text.split('\n\n').map((paragraph, paragraphIndex) => {
      // For each paragraph, handle single newlines for line breaks
      const lines = paragraph.split('\n').map((line, lineIndex, linesArray) => (
        <React.Fragment key={`line-${paragraphIndex}-${lineIndex}`}>
          {line}
          {lineIndex < linesArray.length - 1 && <Text>{'\n'}</Text>}
        </React.Fragment>
      ));
      
      return (
        <Text 
          key={`paragraph-${paragraphIndex}`} 
          style={[
            getTextStyle(styles.problemSummaryText),
            paragraphIndex < text.split('\n\n').length - 1 && styles.paragraphMargin
          ]}
        >
          {lines}
        </Text>
      );
    });
  };

  // Add this ref at the top of your component with other refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Add these new functions before the return statement
  const loadChatHistory = async () => {
    try {
      const historyKey = getChatHistoryKey(id);
      const savedHistory = await AsyncStorage.getItem(historyKey);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setMessages(parsedHistory);
        // Don't trigger scrolling when loading history
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const saveChatHistory = async (newMessages: Array<{
    text: string,
    timestamp: Date,
    role: 'user' | 'assistant'
  }>) => {
    try {
      const historyKey = getChatHistoryKey(id);
      await AsyncStorage.setItem(historyKey, JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Add this useEffect to load chat history when the component mounts
  useEffect(() => {
    if (id) {
      loadChatHistory();
    }
  }, [id]);

  // Add this new function to handle message feedback
  const handleMessageFeedback = async (messageIndex: number, isPositive: boolean) => {
    try {
      // Create a new feedback state
      const newFeedbackState = {
        ...messageFeedback,
        [messageIndex]: isPositive ? 'like' : 'dislike'
      } as Record<number, 'like' | 'dislike' | null>; // Cast to fix type error
      
      setMessageFeedback(newFeedbackState);
      
      // Store feedback data in AsyncStorage
      const feedbackData = {
        messageId: `${id}-message-${messageIndex}`,
        studySetId: id,
        messageIndex,
        isPositive,
        messageText: messages[messageIndex]?.text,
        timestamp: new Date().toISOString(),
      };
      
      // Get existing feedback data or initialize empty array
      const existingDataJson = await AsyncStorage.getItem('message_feedback') || '[]';
      const existingData = JSON.parse(existingDataJson);
      
      // Add new feedback and save back to AsyncStorage
      existingData.push(feedbackData);
      await AsyncStorage.setItem('message_feedback', JSON.stringify(existingData));
      
      // Show feedback toast (using the same style as study content feedback)
      setShowFeedbackToast(true);
      setTimeout(() => setShowFeedbackToast(false), 5000); // Keep visible for 5 seconds
      
      console.log('Message feedback submitted:', feedbackData);
    } catch (error) {
      console.error('Error saving message feedback:', error);
    }
  };

  // Add this function to load previous message feedback
  const loadMessageFeedback = async () => {
    try {
      const feedbackData = await AsyncStorage.getItem('message_feedback') || '[]';
      const parsedFeedback = JSON.parse(feedbackData);
      
      // Filter feedback for this specific study set and create a feedback state object
      const messageFeedbackState: Record<number, 'like' | 'dislike' | null> = {};
      
      parsedFeedback.forEach((item: any) => {
        if (item.studySetId === id) {
          messageFeedbackState[item.messageIndex] = item.isPositive ? 'like' : 'dislike';
        }
      });
      
      setMessageFeedback(messageFeedbackState);
    } catch (error) {
      console.error('Error loading message feedback:', error);
    }
  };

  // Add this to your useEffect section (with the one that loads chat history)
  useEffect(() => {
    if (id) {
      loadChatHistory();
      loadMessageFeedback(); // Add this line
    }
  }, [id]);

  // Update the handleSend function
  const handleSend = async (message: string) => {
    if (!message.trim() || !content) return;
    
    // Mark that the user has interacted with chat
    setHasUserInteracted(true);
    
    // Clear input and minimize chat immediately
    setInputText('');
    setIsActive(false);
    Keyboard.dismiss();
    
    // Create new message
    const userMessage = {
      text: message.trim(),
      timestamp: new Date(),
      role: 'user' as const
    };

    // Update messages with user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Scroll to show the user message
    scrollToBottom();
    
    // Track chat usage
    Analytics.logFeatureUse(FeatureType.CHAT, {
      content_id: id,
      content_type: content.contentType || 'study-set',
      message_length: message.length
    });
    
    try {
      setIsLexieTyping(true);
      
      // Format previous messages for context
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      // Pass the entire conversation history
      const response = await sendChatMessage(
        message,
        'session-1',
        id,
        content.contentType,
        content,
        messageHistory
      );
      
      // Create assistant message
      const assistantMessage = {
        text: response.response,
        timestamp: new Date(),
        role: 'assistant' as const
      };

      // Update messages with assistant response
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);
      
      // Scroll to show the new message
      scrollToBottom();
    } catch (error) {
      console.error('[Chat] Failed to get chat response:', error);
      
      // Log error to analytics
      Analytics.logEvent(EventType.ERROR, {
        feature: 'chat',
        error_message: (error as Error).message || 'Unknown error',
        content_id: id
      });
    } finally {
      setIsLexieTyping(false);
    }
  };

  // Add this component near your other components
  const RotatingLexieIndicator = () => {
    const items = ['L', 'E', 'X', 'I', 'E'];
    const radius = 15; // Made slightly smaller to fit better in the message container
    const animatedValues = useRef(items.map(() => new Animated.Value(0))).current;

    useEffect(() => {
      const animations = animatedValues.map((value, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 2000, // Slowed down slightly for better readability
              delay: index * 200, // Reduced delay between letters
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          ])
        );
      });

      Animated.parallel(animations).start();

      // Cleanup animation when component unmounts
      return () => {
        animations.forEach(anim => anim.stop());
      };
    }, []);

    return (
      <View style={[styles.messageContainer, styles.assistantMessage]}>
        <View style={styles.rotatingContainer}>
          {items.map((letter, index) => {
            const angle = animatedValues[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            });

            const translateX = animatedValues[index].interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [
                radius * Math.cos(0),
                radius * Math.cos(Math.PI / 2),
                radius * Math.cos(Math.PI),
                radius * Math.cos(3 * Math.PI / 2),
                radius * Math.cos(2 * Math.PI)
              ]
            });

            const translateY = animatedValues[index].interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [
                radius * Math.sin(0),
                radius * Math.sin(Math.PI / 2),
                radius * Math.sin(Math.PI),
                radius * Math.sin(3 * Math.PI / 2),
                radius * Math.sin(2 * Math.PI)
              ]
            });

            return (
              <Animated.Text
                key={index}
                style={[
                  styles.rotatingLetter,
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      { rotate: angle }
                    ]
                  }
                ]}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>
      </View>
    );
  };

  // Replace the SpinningLexieIndicator usage with RotatingLexieIndicator
  {isLexieTyping && <RotatingLexieIndicator />}

  // Add these with the other handler functions (around line 400-500)
  const handleImagePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('chat.cancel'), t('chat.takePhoto'), t('chat.chooseFromLibrary')],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
          message: t('chat.addPhoto'),
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1: // Take Photo
              console.log('Take photo');
              break;
            case 2: // Choose from Library
              console.log('Choose from library');
              break;
          }
        }
      );
    } else {
      // For Android, you might want to use a different approach
      console.log('Show Android photo picker');
    }
  };

  const handleRecordPress = () => {
    setIsRecording(!isRecording);
    // Add recording logic here
    console.log('Record pressed');
  };

  // Add logging for screen view
  useEffect(() => {
    if (content) {
      Analytics.logScreenView('StudySet', {
        content_id: id,
        content_type: content.contentType || 'study-set'
      });
    }
  }, [content, id]);

  // At the top of your imports
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  // Add this useEffect to track session duration
  useEffect(() => {
    // Start timing when component mounts
    const startTime = Date.now();
    setSessionStartTime(startTime);
    
    // Log screen view
    Analytics.logScreenView('StudySet', { study_set_id: id });
    
    // Clean up when component unmounts
    return () => {
      // Calculate duration in seconds
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Only log if duration is reasonable (more than 3 seconds to avoid false data)
      if (durationSeconds > 3) {
        console.log('[Analytics] Logging study session duration:', durationSeconds.toFixed(1) + 's');
        
        // Log as SESSION_END event with study_set context
        Analytics.logEvent(EventType.SESSION_END, {
          duration_seconds: durationSeconds,
          context: 'study_set',
          study_set_id: id
        });
      }
    };
  }, [id]); // Only re-run if study set ID changes

  // Add a new effect to handle scrolling when isLexieTyping changes
  useEffect(() => {
    // Only scroll when Lexie is typing if user has interacted
    if (hasUserInteracted && messages.length > 0) {
      if (!isLexieTyping || isLexieTyping) {
        scrollToBottom();
      }
    }
  }, [isLexieTyping, messages.length, hasUserInteracted]);

  // Add this at the top with your other refs
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add this function to check if user is near bottom
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    // Check if user is within 20px of bottom
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
      
    setIsNearBottom(isCloseToBottom);
  };

  // Update scrollToBottom to respect user position
  const scrollToBottom = (immediate = false) => {
    // Clear any pending scroll timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    
    scrollTimerRef.current = setTimeout(() => {
      // Always use animation for a smoother feel, just vary the timing
      scrollViewRef.current?.scrollToEnd({ 
        animated: true 
      });
      scrollTimerRef.current = null;
    }, immediate ? 50 : 200);
  };

  // Add cleanup for timers when component unmounts
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Add this helper function to handle message container layout changes
  const handleMessagesLayout = () => {
    // Only scroll on layout changes if user has interacted
    if (messages.length > 0 && hasUserInteracted) {
      scrollToBottom(true);
    }
  };

  // Add this at the top with your other ref declarations (near scrollViewRef)
  const messagesWrapperRef = useRef<View>(null);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaViewContext style={styles.safeArea} edges={['top']}>
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                onPress={handleBackPress}
                style={styles.headerButton}
              >
                <ChevronLeft color={theme.colors.text} size={18} />
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
                <MoreVertical color={theme.colors.text} size={18} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigationNative.navigate('Home', { openBottomSheet: true })}
              >
                <Plus color={theme.colors.text} size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main scrollable content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{t('studySet.loading')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorSubtext}>
                {t('studySet.tableDisplay')}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={navigateToCards}>
                <Text style={styles.retryButtonText}>{t('studySet.cards.goToFlashcards')}</Text>
              </TouchableOpacity>
            </View>
          ) : content ? (
            <ScrollView 
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              onScrollBeginDrag={() => setShowMoreOptions(false)}
              // Add these two props to ensure scrolling works consistently
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              onScroll={handleScroll}
            >
              <View style={{padding: 16}}>
                {/* Introduction for all content types */}
                <View style={styles.introductionContainer}>
                  <Text style={getTextStyle(styles.introText)}>
                    {content?.introduction || 
                      (isHomeworkHelp(content) && content.homeworkHelp?.language === 'fi'
                        ? t('studySet.introduction.homeworkHelp.fi')
                        : t('studySet.introduction.default'))}
                  </Text>
                </View>

                {/* Conditional rendering based on content type */}
                {contentIsHomeworkHelp ? (
                  // HOMEWORK HELP UI
                  <>
                    {/* Learn card - fixed 50% width */}
                    <TouchableOpacity
                      style={[styles.card, {
                        width: '50%',
                        alignSelf: 'flex-start',
                        flex: 0,
                      }]}
                      onPress={navigateToCards}
                    >
                      <Text style={styles.cardTitle}>{t('studySet.cards.learn')}</Text>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardCount}>
                          {content && isHomeworkHelp(content) && content.homeworkHelp?.concept_cards?.length > 0 
                            ? t('studySet.cards.xCards', { count: content.homeworkHelp.concept_cards.length })
                            : t('studySet.cards.noCards')}
                        </Text>
                      </View>
                      <View style={styles.stackedCardsContainer}>
                        <View style={[styles.stackedCard, styles.cardWhite]} />
                        <View style={[styles.stackedCard, styles.cardYellow]} />
                        <View style={[styles.stackedCard, styles.cardBlue]} />
                      </View>
                    </TouchableOpacity>

                    {/* Assignment section with audio button */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      marginVertical: theme.spacing.sm,
                    }}>
                      {/* Audio button */}
                      <TouchableOpacity 
                        style={styles.listenCircleButton}
                        onPress={handleListenPress}
                        disabled={audioIsLoading}
                      >
                        {audioIsLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.text} />
                        ) : (
                          isPlaying ? (
                            <Pause color="#FFFFFF" size={12} />
                          ) : (
                            <Volume2 color="#FFFFFF" size={12} />
                          )
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {/* Display homework help content with applied font settings */}
                    <View style={styles.homeworkContent}>
                      {/* Problem Summary with better formatting */}
                      {isHomeworkHelp(content) && content.homeworkHelp.problem_summary && (
                        <View style={styles.problemSummaryContainer}>
                          {renderMarkdownContent(content.homeworkHelp.problem_summary)}
                        </View>
                      )}

                      {/* Approach Guidance */}
                      {isHomeworkHelp(content) && (content as HomeworkHelp).homeworkHelp.approach_guidance && (
                        <View style={styles.approachGuidanceContainer}>
                          <Text style={getTextStyle(styles.approachGuidanceTitle)}>
                            {content.homeworkHelp.language === 'fi' ? t('studySet.howToApproach') : t('studySet.howToApproach')}
                          </Text>
                          {renderMarkdownContent(
                            (() => {
                              const guidance = (content as HomeworkHelp).homeworkHelp.approach_guidance;
                              // Check if it's an array and not undefined
                              if (Array.isArray(guidance)) {
                                return guidance.join('\n\n');
                              }
                              // Otherwise, return as is (either string or undefined)
                              return guidance;
                            })(),
                            getApproachGuidanceMarkdownStyles()
                          )}
                        </View>
                      )}
                    </View>

                    {/* Feedback section */}
                    <View style={styles.feedbackContainer}>
                      <View style={styles.feedbackButtons}>
                        <TouchableOpacity 
                          style={styles.feedbackButton} 
                          onPress={() => handleFeedback(true)}
                          disabled={feedbackSubmitted}
                        >
                          <ThumbsUp 
                            color={theme.colors.textSecondary}
                            size={16} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.feedbackButton} 
                          onPress={() => handleFeedback(false)}
                          disabled={feedbackSubmitted}
                        >
                          <ThumbsDown 
                            color={theme.colors.textSecondary}
                            size={16} 
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
                      marginVertical: theme.spacing.sm,
                      gap: theme.spacing.sm,
                      position: 'relative',
                    }}>
                      {/* Learn card */}
                      <TouchableOpacity
                        style={styles.card}
                        onPress={navigateToCards}
                      >
                        <Text style={styles.cardTitle}>{t('studySet.cards.learn')}</Text>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardCount}>
                            {content && isStudySet(content) && content.flashcards?.length > 0 
                              ? t('studySet.cards.xCards', { count: content.flashcards.length })
                              : t('studySet.cards.noCards')}
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
                        <Text style={styles.cardTitle}>{t('studySet.cards.practice')}</Text>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardCount}>
                            {content && isStudySet(content) && content.quiz?.length > 0 
                              ? t('studySet.cards.xQuestions', { count: content.quiz.length })
                              : t('studySet.cards.noQuestions')}
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
                      marginTop: theme.spacing.sm, // Keep spacing above
                      marginBottom: 4, // Reduce spacing below the tabs (previously theme.spacing.sm)
                    }}>
                      <View style={styles.tabContainer}>
                        <TouchableOpacity 
                          style={[styles.tab, selectedTab === 'original' && styles.activeTab]}
                          onPress={() => setSelectedTab('original')}
                        >
                          <Text style={[styles.tabText, selectedTab === 'original' && styles.activeTabText]}>
                            {t('studySet.original')}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.tab, selectedTab === 'summary' && styles.activeTab]}
                          onPress={() => setSelectedTab('summary')}
                        >
                          <Text style={[styles.tabText, selectedTab === 'summary' && styles.activeTabText]}>
                            {t('studySet.summary')}
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
                            <Pause color="#FFFFFF" size={12} />
                          ) : (
                            <Volume2 color="#FFFFFF" size={12} />
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
                            size={16} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.feedbackButton} 
                          onPress={() => handleFeedback(false)}
                          disabled={feedbackSubmitted}
                        >
                          <ThumbsDown 
                            color={theme.colors.textSecondary}
                            size={16} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}

                {/* Add messages section at the bottom of the content */}
                {messages.length > 0 && (
                  <View 
                    ref={messagesWrapperRef}
                    style={[styles.messagesWrapper, {marginLeft: -8}]}
                    onLayout={handleMessagesLayout}
                  >
                    {messages.map((message, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.messageContainer,
                          message.role === 'user' ? styles.userMessage : styles.assistantMessage
                        ]}
                      >
                        <Text style={styles.messageText}>{message.text}</Text>
                        {message.role === 'assistant' && (
                          <View style={styles.messageFooter}>
                            <TouchableOpacity 
                              style={styles.messageIconButton}
                              onPress={() => handleMessageFeedback(index, true)}
                              disabled={messageFeedback[index] !== undefined}
                            >
                              <ThumbsUp 
                                color={messageFeedback[index] === 'like' 
                                  ? theme.colors.primary 
                                  : theme.colors.textSecondary} 
                                size={16} 
                                style={styles.messageIcon} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.messageIconButton}
                              onPress={() => handleMessageFeedback(index, false)}
                              disabled={messageFeedback[index] !== undefined}
                            >
                              <ThumbsDown 
                                color={messageFeedback[index] === 'dislike' 
                                  ? theme.colors.primary 
                                  : theme.colors.textSecondary} 
                                size={16} 
                                style={styles.messageIcon} 
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                    {isLexieTyping && (
                      <View style={[styles.messageContainer, styles.assistantMessage]}>
                        <LoadingDot />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t('studySet.noContent')}</Text>
            </View>
          )}

          {/* Chat Interface - moved inside KeyboardAvoidingView */}
          <View style={[styles.chatContainer]}>
            {isActive ? (
              <View style={styles.chatInputWrapper}>
                <View style={styles.chatInputRow}>
                  <TextInput
                    ref={inputRef}
                    style={styles.chatInput}
                    placeholder={t('chat.askLexie')}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={(e) => handleSend(e.nativeEvent.text)}
                    blurOnSubmit={false}
                    returnKeyType="send"
                  />
                </View>
                
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={handleImagePress}
                  >
                    <Plus color={theme.colors.text} size={16} />
                  </TouchableOpacity>
                  
                  {inputText.length > 0 ? (
                    <TouchableOpacity 
                      style={[styles.iconButton, styles.activeIconButton]} 
                      onPress={() => handleSend(inputText)}
                    >
                      <ArrowUp color="#000000" size={16} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.iconButton} 
                      onPress={handleRecordPress}
                    >
                      <Mic 
                        color={isRecording ? theme.colors.primary : theme.colors.text} 
                        size={16} 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={() => {
                  setIsActive(true);
                  // Mark that user is starting to interact
                  setHasUserInteracted(true);
                  setTimeout(() => {
                    inputRef.current?.focus();
                  }, 100);
                }}
              >
                <Text style={styles.chatButtonText}>{t('chat.askLexie')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Audio player overlay */}
        {showAudioPlayer && content && (
          <AudioPlayer 
            content={content}
            selectedTab={selectedTab}
            onClose={handleCloseAudio}
            isPlaying={isPlaying}
            onPlayPause={isPlaying ? pauseAudio : resumeAudio}
            onSeek={seekAudio}
            currentTime={position}
            duration={duration}
            formattedPosition={formattedPosition}
            formattedDuration={formattedDuration}
          />
        )}

        {/* Modals and other elements */}
        {folderSelectVisible && (
          <FolderSelectModal
            visible={folderSelectVisible}
            onClose={() => setFolderSelectVisible(false)}
            onCreateNew={handleCreateNewFolder}
            folders={folders || []}
            selectedFolderId={studySet?.folder_id || null}
            selectedStudySetId={studySet?.id} // Pass the study set ID here
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
                <X color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>
            <Text style={styles.feedbackToastText}>
              {t('feedback.thankYou')}
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
      </SafeAreaViewContext>
    </KeyboardAvoidingView>
  );
}

// Consolidated styles
const styles = StyleSheet.create({
  // Base Layout
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
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
    marginLeft: theme.spacing.sm,
  },

  // Chat Interface
  chatContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 12,
    paddingBottom: 24,
    marginTop: 'auto',
    minHeight: Platform.OS === 'ios' ? 60 : 52,
  },
  chatButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  chatButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  chatInputWrapper: {
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    height: 40,
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: 20,
  },
  activeIconButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  // Messages
  messagesWrapper: {
    marginTop: 4,
    marginBottom: 16,
    
  },
  messageContainer: {
    marginLeft: 0, 
    marginStart: 0, 
    backgroundColor: theme.colors.background02,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.background02,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  messageIcon: {
    opacity: 1,
  },
  messageIconButton: {
    padding: 4,
  },

  // Loading & Error States
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
  },
  errorSubtext: {
    color: 'gray',
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
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

  // Feedback
  feedbackContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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

  // Toast Notifications
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

  // Homework Help Sections
  homeworkContent: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  introductionContainer: {
    marginBottom: theme.spacing.sm,
    paddingBottom: 4,
  },
  introText: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  problemSummaryContainer: {
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
  },
  problemSummaryText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    lineHeight: 28,
    textAlign: 'left',
    marginBottom: theme.spacing.xs,
  },
  paragraphMargin: {
    marginBottom: 16,
  },
  approachGuidanceContainer: {
    marginBottom: theme.spacing.sm,
    paddingLeft: 16,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: 12,
  },
  approachGuidanceTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },

  // Cards and UI Components
  card: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    position: 'absolute',
    bottom: 10,
    left: 12,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: 'medium',
    color: theme.colors.text,
    opacity: 0.9,
  },

  // Card Decorations
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

  // Practice Cards
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

  // Audio Player
  listenCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

  // Typing Indicator
  typingIndicator: {
    flexDirection: 'row',
    padding: 8,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.7,
    marginHorizontal: 2,
  },
  spinningLogoContainer: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinningLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  rotatingContainer: {
    width: 80, 
    height: 80, 
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  rotatingLetter: {
    position: 'absolute',
    fontSize: 16, 
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    width: 16,
    height: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    margin: 8,
  },
  activeMessageIcon: {
    opacity: 1,
  },

  vocabularyTable: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    marginVertical: 16,
    backgroundColor: theme.colors.background,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background02,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    paddingVertical: 12,
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    paddingVertical: 12,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  sourceTermCell: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  vocabularyContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
});

// Add this component inside StudySetScreen component
const LoadingDot = () => {
  const scale = new Animated.Value(0.5);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.5,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(animation).start();

    return () => animation.stop();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.loadingDot, 
        { transform: [{ scale }] }
      ]} 
    />
  );
};