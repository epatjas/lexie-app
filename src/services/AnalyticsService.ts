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
  ACTIVE_WEEK = 'active_week',
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
  private sessionStartTime: number = 0;

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
      
      // Update active weeks tracking whenever a session starts
      await this.updateActiveWeeks();
      
      // Record session start time
      this.sessionStartTime = Date.now();
      
      // Log session start event
      await this.logEvent(EventType.SESSION_START, {
        start_time: new Date().toISOString()
      });
      
      return this.sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      this.sessionId = generateId();
      return this.sessionId;
    }
  }

  // End the current session
  public async endSession() {
    try {
      if (this.sessionId) {
        const endTime = Date.now();
        const sessionDuration = this.sessionStartTime > 0 ? 
          (endTime - this.sessionStartTime) / 1000 : 0; // duration in seconds
        
        // Log session end with duration
        await this.logEvent(EventType.SESSION_END, {
          end_time: new Date().toISOString(),
          duration_seconds: sessionDuration,
          session_id: this.sessionId
        });
        
        this.sessionId = null;
        this.sessionStartTime = 0;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      this.sessionId = null;
    }
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

  // Calculate average session time
  public async getAverageSessionTime(): Promise<number> {
    try {
      // Get all session end events that have duration data
      const sessionEndEvents = await this.getEventsByType(EventType.SESSION_END);
      const sessionsWithDuration = sessionEndEvents.filter(
        event => event.properties?.duration_seconds
      );
      
      if (sessionsWithDuration.length === 0) return 0;
      
      // Calculate average duration
      const totalDuration = sessionsWithDuration.reduce(
        (sum, event) => sum + (event.properties?.duration_seconds || 0), 
        0
      );
      
      return totalDuration / sessionsWithDuration.length;
    } catch (error) {
      console.error('Failed to calculate average session time:', error);
      return 0;
    }
  }

  // Get average session time per user
  public async getAverageSessionTimePerUser(): Promise<Record<string, number>> {
    try {
      // Get all session end events with duration and user data
      const sessionEndEvents = await this.getEventsByType(EventType.SESSION_END);
      const userSessions: Record<string, number[]> = {};
      
      // Group durations by user
      sessionEndEvents.forEach(event => {
        if (event.userId && event.properties?.duration_seconds) {
          if (!userSessions[event.userId]) {
            userSessions[event.userId] = [];
          }
          userSessions[event.userId].push(event.properties.duration_seconds);
        }
      });
      
      // Calculate average for each user
      const userAverages: Record<string, number> = {};
      Object.entries(userSessions).forEach(([userId, durations]) => {
        const total = durations.reduce((sum, duration) => sum + duration, 0);
        userAverages[userId] = total / durations.length;
      });
      
      return userAverages;
    } catch (error) {
      console.error('Failed to calculate per-user session times:', error);
      return {};
    }
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

  // Get weekly retention rate
  public async getWeeklyRetentionRate(): Promise<{ rate: number, data: any }> {
    try {
      // Get active weeks data
      const activeWeeksStr = await AsyncStorage.getItem(ACTIVE_WEEKS_KEY) || '[]';
      const activeWeeks = JSON.parse(activeWeeksStr);
      
      if (!activeWeeks.length || activeWeeks.length < 2) {
        return { rate: 0, data: { message: 'Not enough data to calculate retention' } };
      }
      
      // Sort weeks chronologically
      activeWeeks.sort((a: number, b: number) => a - b);
      
      // Count consecutive weeks
      let consecutiveCount = 0;
      for (let i = 1; i < activeWeeks.length; i++) {
        if (activeWeeks[i] === activeWeeks[i-1] + 1) {
          consecutiveCount++;
        }
      }
      
      // Calculate retention rate (consecutive weeks / total weeks - 1)
      const rate = activeWeeks.length > 1 ? 
        consecutiveCount / (activeWeeks.length - 1) : 0;
      
      return { 
        rate, 
        data: {
          activeWeeks,
          consecutiveCount,
          totalWeeks: activeWeeks.length
        }
      };
    } catch (error) {
      console.error('Error calculating weekly retention:', error);
      return { 
        rate: 0, 
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      };
    }
  }

  // Get study sets per user
  public async getStudySetsPerUser(): Promise<number> {
    try {
      // Get all study set created events
      const studySetEvents = await this.getEventsByType(EventType.STUDY_SET_CREATED);
      
      // Count unique users who have been active
      const userIds = new Set();
      const allEvents = await this.getAllEvents();
      
      allEvents.forEach(event => {
        if (event.userId) {
          userIds.add(event.userId);
        }
      });
      
      // Check if we have users and study sets
      if (userIds.size === 0) return 0;
      
      // Calculate average study sets per user
      return studySetEvents.length / userIds.size;
    } catch (error) {
      console.error('Failed to calculate study sets per user:', error);
      return 0;
    }
  }

  // Add a method to track study set creation
  public async logStudySetCreated(studySetId: string, metadata: Record<string, any> = {}) {
    return this.logEvent(EventType.STUDY_SET_CREATED, {
      study_set_id: studySetId,
      ...metadata
    });
  }

  // Get week number helper
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Update user's active weeks tracking
  private async updateActiveWeeks(): Promise<void> {
    try {
      const now = new Date();
      const weekNumber = this.getWeekNumber(now);
      const year = now.getFullYear();
      const weekKey = `${year}-${weekNumber}`;
      
      const activeWeeksStr = await AsyncStorage.getItem(ACTIVE_WEEKS_KEY) || '[]';
      const activeWeeks = JSON.parse(activeWeeksStr);
      
      // Only add the week if it's not already recorded
      if (!activeWeeks.includes(weekKey)) {
        activeWeeks.push(weekKey);
        await AsyncStorage.setItem(ACTIVE_WEEKS_KEY, JSON.stringify(activeWeeks));
        
        // Also send this data to the server
        this.logEvent(EventType.ACTIVE_WEEK, { 
          week_number: weekNumber,
          year: year,
          week_key: weekKey
        });
      }
    } catch (error) {
      console.error('Failed to update active weeks:', error);
    }
  }

  private async sendEventsToServer(events: AnalyticsEvent[]) {
    try {
      console.log('Sending events to server:', events.length);
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
      
      // Add detailed logging
      const responseText = await response.text();
      console.log('Server response:', response.status, responseText);
      
      if (response.ok) {
        console.log('Analytics data sent successfully');
        // Clear local events after successful send
        await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, '[]');
      } else {
        console.error('Server returned error:', response.status, responseText);
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