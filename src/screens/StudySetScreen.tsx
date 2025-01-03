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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySet';
import { ArrowLeft, FlipHorizontal, Zap, Play, Folder, Calendar, Trash2, Pause } from 'lucide-react-native';
import { useFolders } from '../hooks/useFolders';
import FolderSelectModal from '../components/FolderSelectModal';
import FolderCreationModal from '../components/FolderCreationModal';
import Markdown from 'react-native-markdown-display';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;

// Define the markdown styles type
type MarkdownStylesObject = {
  [key: string]: TextStyle | ViewStyle;
};

export default function StudySetScreen({ route, navigation }: StudySetScreenProps): React.JSX.Element {
  const [folderSelectVisible, setFolderSelectVisible] = useState(false);
  const [folderCreateVisible, setFolderCreateVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { folders, addFolder, assignStudySetToFolder, updateFolder } = useFolders();
  const { studySet, refreshStudySet, loading, deleteStudySet } = useStudySetDetails(route.params?.id);
  const { isPlaying, currentTime, togglePlayback, error, isLoading, progress } = useAudioPlayback({
    text: studySet?.text_content?.raw_text || '',
  });

  useEffect(() => {
    if (!route.params?.id) {
      console.error('No study set ID provided');
    }
  }, [route.params?.id]);

  useEffect(() => {
    console.log('Should render FolderCreationModal:', folderCreateVisible);
  }, [folderCreateVisible]);

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
      console.error('Error in handleCreateFolder:', error);
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
      console.error('Error selecting folder:', error);
      Alert.alert('Error', 'Failed to assign study set to folder');
    }
  };

  const handleCreateNewFolder = () => {
    console.log('Opening folder creation modal');
    setFolderCreateVisible(true);
  };

  const handleCreateQuiz = () => {
    if (route.params?.id) {
      navigation.navigate('Quiz', { studySetId: route.params.id });
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

  const convertSectionsToMarkdown = (sections: any[]): string => {
    return sections.map(section => {
      switch (section.type) {
        case 'heading':
          // Add appropriate number of # based on heading level
          const headingMarks = '#'.repeat(section.level || 1);
          return `${headingMarks} ${section.raw_text}\n\n`;
          
        case 'paragraph':
          // Add double newline after paragraphs
          return `${section.raw_text}\n\n`;
          
        case 'list':
          // Convert items to bullet points or numbered list
          return section.items.map((item: string, index: number) => {
            // Check if the item starts with a number for ordered lists
            if (/^\d+\./.test(item)) {
              return `${item}\n`;
            }
            return `* ${item}\n`;
          }).join('') + '\n';
          
        default:
          return `${section.raw_text}\n\n`;
      }
    }).join('');
  };

  if (!route.params?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <ArrowLeft color={theme.colors.text} size={24} />
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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitleText}>Loading...</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
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
            <ArrowLeft color={theme.colors.text} size={24} />
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

  const renderContent = () => {
    if (!studySet.text_content) {
      return <Text style={styles.loadingText}>Loading content...</Text>;
    }

    const markdownContent = convertSectionsToMarkdown(studySet.text_content.sections);

    return (
      <Markdown style={markdownStyles}>
        {markdownContent}
      </Markdown>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleDeletePress}
            style={styles.deleteButton}
          >
            <Trash2 color={theme.colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {studySet.title}
          </Text>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Calendar size={20} color={theme.colors.textSecondary} />
              <Text style={styles.metaLabel}>Päivämäärä</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>

            <View style={styles.metaItem}>
              <Folder size={20} color={theme.colors.textSecondary} />
              <Text style={styles.metaLabel}>Kansio</Text>
              {currentFolder ? (
                <TouchableOpacity
                  style={[
                    styles.folderValue,
                    { backgroundColor: currentFolder.color }
                  ]}
                  onPress={() => setFolderSelectVisible(true)}
                >
                  <Text style={styles.folderText}>
                    {currentFolder.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setFolderSelectVisible(true)}
                >
                  <Text style={styles.emptyFolderText}>Empty</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleFlashcardsPress}
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.lavender + '20' }]}>
              <FlipHorizontal color={theme.colors.background} size={20} />
            </View>
            <Text style={styles.optionTitle}>Harjoittele avainkäsitteitä</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleCreateQuiz}
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.mint + '20' }]}>
              <Zap color={theme.colors.background} size={20} />
            </View>
            <Text style={styles.optionTitle}>Testaa taitosi</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.contentSection}>
            <TouchableOpacity 
              style={styles.listenButton}
              onPress={handleListenPress}
              disabled={isLoading}
            >
              <View style={styles.listenIcon}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : isPlaying ? (
                  <Pause color={theme.colors.text} size={20} />
                ) : (
                  <Play color={theme.colors.text} size={20} />
                )}
              </View>
              <Text style={styles.listenButtonText}>
                {isLoading ? 
                  'Luodaan ääntä...' :
                  isPlaying ? 
                    `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}` : 
                    'Kuuntele'
                }
              </Text>
            </TouchableOpacity>
            
            {renderContent()}
          </View>
        </View>
      </ScrollView>

      {folderSelectVisible && (
        <FolderSelectModal
          visible={folderSelectVisible}
          onClose={() => setFolderSelectVisible(false)}
          onCreateNew={handleCreateNewFolder}
          folders={folders}
          selectedFolderId={studySet.folder_id}
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
          <Text style={styles.toastText}>Tulossa pian</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
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
    paddingLeft: theme.spacing.xs,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
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
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    borderRadius: theme.borderRadius.xxl,
    alignSelf: 'flex-start',
  },
  listenButtonText: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  listenIcon: {
    marginRight: 2,
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
  deleteButton: {
    padding: theme.spacing.xs,
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
});

const markdownStyles: Record<string, TextStyle | ViewStyle> = {
  heading1: {
    fontSize: 20,
    color: theme.colors.text,
    lineHeight: 26,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 12,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    marginBottom: 24,
    lineHeight: 27,
  },
  strong: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },

  ordered_list: {
    paddingTop: theme.spacing.md,
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  bullet_list_icon: {
    marginRight: theme.spacing.xs,
    color: theme.colors.text,
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

