import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useStudySetDetails } from '../hooks/useStudySetDetails';
import { ArrowLeft, FlipHorizontal, Zap, Play, Folder, Calendar } from 'lucide-react-native';
import { useFolders } from '../hooks/useFolders';
import FolderSelectModal from '../components/FolderSelectModal';
import FolderCreationModal from '../components/FolderCreationModal';
import Markdown from 'react-native-markdown-display';

type StudySetScreenProps = NativeStackScreenProps<RootStackParamList, 'StudySet'>;

// Define the markdown styles type
type MarkdownStylesObject = {
  [key: string]: TextStyle | ViewStyle;
};

export default function StudySetScreen({ route, navigation }: StudySetScreenProps): React.JSX.Element {
  const [folderSelectVisible, setFolderSelectVisible] = useState(false);
  const [folderCreateVisible, setFolderCreateVisible] = useState(false);
  const { folders, addFolder, assignStudySetToFolder, updateFolder } = useFolders();
  const { studySet, refreshStudySet, loading } = useStudySetDetails(route.params?.id);

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

    return (
      <Markdown 
        style={markdownStyles}
        mergeStyle={false}
      >
        {studySet.text_content.raw_text}
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
            <TouchableOpacity style={styles.listenButton}>
              <View style={styles.listenIcon}>
                <Play color={theme.colors.text} size={20} />
              </View>
              <Text style={styles.listenButtonText}>Kuuntele</Text>
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
    padding: theme.spacing.xs,
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
    marginRight: theme.spacing.xs,
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
});

const markdownStyles: MarkdownStylesObject = {
  body: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  } as TextStyle,
  heading1: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: theme.spacing.lg,
  } as TextStyle,
  heading2: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: theme.spacing.lg,
  } as TextStyle,
  paragraph: {
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
  } as TextStyle,
  blockquote: {
    backgroundColor: '#332167',
    borderLeftWidth: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 24,
    paddingLeft: 12,
    paddingTop: 16,
    paddingRight: 0,
    borderRadius: theme.borderRadius.md,
  } as ViewStyle,
  blockquote_text: {
    color: theme.colors.text,
  } as TextStyle,
  blockquote_section: {
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
  } as ViewStyle,
};
