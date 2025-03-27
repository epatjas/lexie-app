import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Event names - centralize all analytics event names
export const AnalyticsEvents = {
  // Session events
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Study set events
  STUDY_SET_CREATE: 'study_set_create',
  STUDY_SET_VIEW: 'study_set_view',
  STUDY_SET_DELETE: 'study_set_delete',
  
  // Feature usage events
  FLASHCARD_START: 'flashcard_start',
  FLASHCARD_COMPLETE: 'flashcard_complete',
  QUIZ_START: 'quiz_start',
  QUIZ_COMPLETE: 'quiz_complete',
  
  // Feedback events
  FEEDBACK_SUBMIT: 'feedback_submit',
  CONTENT_FEEDBACK: 'content_feedback',
  
  // Chat events
  CHAT_MESSAGE_SEND: 'chat_message_send',
  CHAT_FEEDBACK: 'chat_feedback'
} as const;

class AnalyticsService {
  private sessionStartTime: number | null = null;
  
  constructor() {
    this.initializeAnalytics();
  }
  
  private async initializeAnalytics() {
    // Disable ad ID collection
    await analytics().setAnalyticsCollectionEnabled(false);
    
    // Configure analytics without ad tracking
    await analytics().setUserProperty('allows_advertising_tracking', 'false');
    
    // Re-enable analytics with privacy-compliant settings
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Load user properties
    await this.setUserProperties();
  }
  
  private async setUserProperties() {
    const userId = await AsyncStorage.getItem('user_id');
    if (userId) {
      await analytics().setUserId(userId);
    }
  }
  
  // Session tracking
  async trackSessionStart() {
    this.sessionStartTime = Date.now();
    await analytics().logEvent(AnalyticsEvents.SESSION_START);
    
    // Store session start time
    await AsyncStorage.setItem('last_session_start', this.sessionStartTime.toString());
  }
  
  async trackSessionEnd() {
    if (this.sessionStartTime) {
      const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      await analytics().logEvent(AnalyticsEvents.SESSION_END, {
        duration: sessionDuration
      });
      
      await this.updateSessionHistory(sessionDuration);
    }
  }
  
  // Study set tracking
  async trackStudySetCreate(studySetId: string, type: 'study-set' | 'homework-help') {
    await analytics().logEvent(AnalyticsEvents.STUDY_SET_CREATE, {
      study_set_id: studySetId,
      content_type: type
    });
  }
  
  async trackStudySetView(studySetId: string, duration: number) {
    await analytics().logEvent(AnalyticsEvents.STUDY_SET_VIEW, {
      study_set_id: studySetId,
      view_duration: duration
    });
  }
  
  // Feature usage tracking
  async trackFeatureUse(
    feature: 'flashcards' | 'quiz' | 'chat',
    action: 'start' | 'complete',
    metadata?: Record<string, any>
  ) {
    const eventName = `${feature}_${action}`.toUpperCase();
    await analytics().logEvent(eventName, metadata);
  }
  
  // Feedback tracking
  async trackFeedback(type: string, isPositive: boolean, metadata?: Record<string, any>) {
    await analytics().logEvent(AnalyticsEvents.FEEDBACK_SUBMIT, {
      feedback_type: type,
      is_positive: isPositive,
      ...metadata
    });
  }
  
  private async updateSessionHistory(duration: number) {
    try {
      const now = new Date();
      const sessionData = {
        timestamp: now.toISOString(),
        duration: duration
      };
      
      const historyString = await AsyncStorage.getItem('session_history');
      const history = historyString ? JSON.parse(historyString) : [];
      
      history.push(sessionData);
      
      // Keep only last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const filteredHistory = history.filter((session: any) => 
        new Date(session.timestamp) >= ninetyDaysAgo
      );
      
      await AsyncStorage.setItem('session_history', JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Failed to update session history:', error);
    }
  }
}

export const analyticsService = new AnalyticsService(); 