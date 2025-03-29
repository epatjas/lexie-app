import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Event types
export enum EventType {
  APP_OPEN = 'app_open',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  SCREEN_VIEW = 'screen_view',
  FEATURE_USE = 'feature_use',
  STUDY_SET_CREATED = 'study_set_created',
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  CONTENT_FEEDBACK = 'content_feedback',
  FLASHCARD_INTERACTION = 'flashcard_interaction',
  QUIZ_INTERACTION = 'quiz_interaction',
  SETTINGS_CHANGE = 'settings_change',
  ERROR = 'error',
}

// Feature types
export enum FeatureType {
  FLASHCARDS = 'flashcards',
  QUIZ = 'quiz',
  AUDIO = 'audio',
  FONT_SELECTION = 'font_selection',
  CHAT = 'chat',
  FOLDER = 'folder',
}

// Feedback types
export enum FeedbackType {
  APP_FEEDBACK = 'app_feedback',
  CONTENT_FEEDBACK = 'content_feedback',
  FLASHCARD_FEEDBACK = 'flashcard_feedback',
  QUIZ_FEEDBACK = 'quiz_feedback',
}

// Base event interface
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  type: EventType;
  timestamp: string;
  platform: string;
  sessionId: string;
  properties?: Record<string, any>;
}

// Storage keys
const ANALYTICS_EVENTS_KEY = 'analytics_events';
const SESSION_ID_KEY = 'current_session_id';
const LAST_SESSION_TIME_KEY = 'last_session_time';
const ACTIVE_WEEKS_KEY = 'active_weeks';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Generate a simple unique ID without external dependencies
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

class AnalyticsService {
  private sessionId: string | null = null;
  private userId: string | null = null;
  private deviceId: string = '';
  private appVersion: string = '';

  constructor() {
    // No initialization to avoid hooks issues
  }

  // Start a new session
  public async startSession(): Promise<string> {
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      
      this.sessionId = generateId();
      await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId);
      await AsyncStorage.setItem(LAST_SESSION_TIME_KEY, nowIso);
      
      // Track active weeks for retention calculation
      const weekNumber = this.getWeekNumber(now);
      const activeWeeksStr = await AsyncStorage.getItem(ACTIVE_WEEKS_KEY) || '[]';
      const activeWeeks = new Set(JSON.parse(activeWeeksStr));
      activeWeeks.add(weekNumber);
      await AsyncStorage.setItem(ACTIVE_WEEKS_KEY, JSON.stringify([...activeWeeks]));
      
      return this.sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      this.sessionId = generateId();
      return this.sessionId;
    }
  }

  // End the current session
  public async endSession() {
    this.sessionId = null;
  }

  // Set user ID
  public setUserId(userId: string) {
    this.userId = userId;
  }

  // Log an event
  public async logEvent(type: EventType, properties: Record<string, any> = {}) {
    try {
      if (!this.sessionId) {
        await this.startSession();
      }
      
      const event: AnalyticsEvent = {
        id: generateId(),
        userId: this.userId || undefined,
        type,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        sessionId: this.sessionId || 'unknown',
        properties
      };
      
      // Get existing events
      const eventsJson = await AsyncStorage.getItem(ANALYTICS_EVENTS_KEY) || '[]';
      let events: AnalyticsEvent[] = JSON.parse(eventsJson);
      
      // Add new event
      events.push(event);
      
      // Limit events count to prevent excessive storage use
      if (events.length > 1000) {
        events = events.slice(events.length - 1000);
      }
      
      // Save updated events
      await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(events));
      
      // Try to sync every 10 events
      if (events.length % 10 === 0) {
        this.syncEvents();
      }
      
      return event;
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  // Log screen view
  public async logScreenView(screenName: string, additionalProps: Record<string, any> = {}) {
    return this.logEvent(EventType.SCREEN_VIEW, {
      screen_name: screenName,
      ...additionalProps
    });
  }

  // Log feature usage
  public async logFeatureUse(featureName: FeatureType, additionalProps: Record<string, any> = {}) {
    return this.logEvent(EventType.FEATURE_USE, {
      feature_name: featureName,
      ...additionalProps
    });
  }

  // Log feedback
  public async logFeedback(
    feedbackType: FeedbackType, 
    isPositive: boolean, 
    details: Record<string, any> = {}
  ) {
    return this.logEvent(EventType.FEEDBACK_SUBMITTED, {
      feedback_type: feedbackType,
      is_positive: isPositive,
      ...details
    });
  }

  // Log content feedback
  public async logContentFeedback(
    contentType: string,
    contentId: string,
    isPositive: boolean,
    additionalProps: Record<string, any> = {}
  ) {
    return this.logEvent(EventType.CONTENT_FEEDBACK, {
      content_type: contentType,
      content_id: contentId,
      is_positive: isPositive,
      ...additionalProps
    });
  }

  // Get all events
  public async getAllEvents(): Promise<AnalyticsEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(ANALYTICS_EVENTS_KEY) || '[]';
      return JSON.parse(eventsJson);
    } catch (error) {
      console.error('Failed to get analytics events:', error);
      return [];
    }
  }

  // Get events by type
  public async getEventsByType(type: EventType): Promise<AnalyticsEvent[]> {
    const allEvents = await this.getAllEvents();
    return allEvents.filter(event => event.type === type);
  }

  // Calculate average session time (placeholder)
  public async getAverageSessionTime(): Promise<number> {
    return 0; // Simplified
  }

  // Get feature usage counts
  public async getFeatureUsageCounts(): Promise<Record<string, number>> {
    try {
      const featureEvents = await this.getEventsByType(EventType.FEATURE_USE);
      const counts: Record<string, number> = {};
      
      for (const event of featureEvents) {
        const featureName = event.properties?.feature_name;
        if (featureName) {
          counts[featureName] = (counts[featureName] || 0) + 1;
        }
      }
      
      return counts;
    } catch (error) {
      console.error('Failed to get feature usage counts:', error);
      return {};
    }
  }

  // Clear all analytics data
  public async clearData() {
    try {
      await AsyncStorage.removeItem(ANALYTICS_EVENTS_KEY);
      console.log('Analytics data cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }

  // Export data
  public async exportData(): Promise<string> {
    try {
      const events = await this.getAllEvents();
      return JSON.stringify(events);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return '[]';
    }
  }

  // Get weekly retention rate (placeholder)
  public async getWeeklyRetentionRate(): Promise<number> {
    return 0; // Simplified
  }

  // Get study sets per user (placeholder)
  public async getStudySetsPerUser(): Promise<number> {
    return 0; // Simplified
  }

  // Get week number helper
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private async sendEventsToServer(events: AnalyticsEvent[]) {
    try {
      const response = await fetch('https://lexie-analytics-server.vercel.app/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          deviceId: this.deviceId,
          appVersion: this.appVersion,
          platform: Platform.OS,
        }),
      });
      
      if (response.ok) {
        console.log('Analytics data sent successfully');
        // Clear local events after successful send
        await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, '[]');
      }
    } catch (error) {
      console.error('Failed to send analytics data:', error);
      // Keep the data locally if send fails
    }
  }

  // Add a sync method that gets called periodically
  public async syncEvents() {
    try {
      const events = await this.getAllEvents();
      if (events.length > 0) {
        await this.sendEventsToServer(events);
      }
    } catch (error) {
      console.error('Failed to sync analytics events:', error);
    }
  }
}

// Export singleton instance
export const Analytics = new AnalyticsService(); 