import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ChatMessage as ChatMessageType } from '../types/types';
import { getChatMessages } from '../services/Database';
import Markdown from 'react-native-markdown-display';
import theme from '../styles/theme';

interface ChatMessageListProps {
  sessionId: string;
  contentId: string;
  contentType: 'study-set' | 'homework-help';
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ 
  sessionId,
  contentId,
  contentType 
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const chatMessages = await getChatMessages(sessionId);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    };
    
    loadMessages();
  }, [sessionId]);

  const getMarkdownStyles = () => ({
    body: {
      color: theme.colors.text,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: theme.fonts.regular,
    },
    paragraph: {
      marginVertical: 8,
      color: theme.colors.text,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: theme.fonts.regular,
    },
    link: {
      color: theme.colors.primary,
    },
  });

  return (
    <FlatList
      data={messages}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View 
          style={[
            styles.messageContainer,
            item.role === 'user' ? styles.userMessage : styles.assistantMessage
          ]}
        >
          <Markdown style={getMarkdownStyles()}>
            {item.content}
          </Markdown>
        </View>
      )}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  messageContainer: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.background02,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    lineHeight: 24,
  },
});

export default ChatMessageList; 