import { useState, useEffect, useCallback } from 'react';
import { 
  createChatSession, 
  getChatSessionsForContent 
} from '../services/Database';
import { ChatSession } from '../types/types';

export const useChat = (contentId: string, contentType: 'study-set' | 'homework-help', title: string) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load existing chat sessions for this content
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        const chatSessions = await getChatSessionsForContent(contentId);
        setSessions(chatSessions);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        setLoading(false);
      }
    };
    
    if (contentId) {
      loadSessions();
    }
  }, [contentId]);
  
  // Function to create a new chat session
  const createNewSession = useCallback(async (profileId: string = '') => {
    try {
      const newSession = await createChatSession(
        contentId,
        contentType,
        title,
        profileId
      );
      
      setSessions(prevSessions => [newSession, ...prevSessions]);
      setActiveSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw error;
    }
  }, [contentId, contentType, title]);
  
  // Function to select an existing session
  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSession(session);
    }
  }, [sessions]);
  
  // Function to close the active session
  const closeSession = useCallback(() => {
    setActiveSession(null);
  }, []);
  
  return {
    sessions,
    activeSession,
    loading,
    createNewSession,
    selectSession,
    closeSession
  };
}; 