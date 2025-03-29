import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { Analytics, EventType, FeatureType } from '../services/AnalyticsService';

type AnalyticsManagerScreenProps = NativeStackScreenProps<RootStackParamList, 'AnalyticsManager'>;

export default function AnalyticsManagerScreen({ navigation }: AnalyticsManagerScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<{
    totalEvents: number;
    eventCounts: Record<string, number>;
    featureUsage: Record<string, number>;
    retentionRate: number;
    averageSessionTime: number;
    studySetsPerUser: number;
  }>({
    totalEvents: 0,
    eventCounts: {},
    featureUsage: {},
    retentionRate: 0,
    averageSessionTime: 0,
    studySetsPerUser: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allEvents = await Analytics.getAllEvents();
      
      // Calculate counts by event type
      const eventCounts: Record<string, number> = {};
      for (const event of allEvents) {
        eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
      }
      
      // Get feature usage counts
      const featureUsage = await Analytics.getFeatureUsageCounts();
      
      // Get other metrics
      const retentionRate = await Analytics.getWeeklyRetentionRate();
      const averageSessionTime = await Analytics.getAverageSessionTime();
      const studySetsPerUser = await Analytics.getStudySetsPerUser();
      
      setSummaryData({
        totalEvents: allEvents.length,
        eventCounts,
        featureUsage,
        retentionRate,
        averageSessionTime,
        studySetsPerUser,
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await Analytics.exportData();
      
      const result = await Share.share({
        message: data,
        title: 'LexieLearn Analytics Data',
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Analytics data shared successfully');
      }
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      Alert.alert('Error', 'Failed to export analytics data');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Analytics Data',
      'Are you sure you want to clear all analytics data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            await Analytics.clearData();
            loadData();
          }
        },
      ]
    );
  };

  const handleSubmitFeedback = async () => {
    try {
      const data = await Analytics.exportData();
      
      const url = `mailto:your-email@example.com?subject=LexieLearn%20Analytics%20Data&body=${encodeURIComponent(data)}`;
      Linking.openURL(url);
      
      // Clear data after sending
      await Analytics.clearData();
      Alert.alert('Success', 'Thank you for submitting your analytics data!');
    } catch (error) {
      console.error('Failed to send analytics data:', error);
      Alert.alert('Error', 'Failed to send analytics data. Please try again.');
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Manager</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Key Metrics</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Weekly Retention Rate:</Text>
              <Text style={styles.metricValue}>{formatPercentage(summaryData.retentionRate)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Study Sets Per User:</Text>
              <Text style={styles.metricValue}>{summaryData.studySetsPerUser.toFixed(1)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avg. Session Time:</Text>
              <Text style={styles.metricValue}>{formatTime(summaryData.averageSessionTime)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Events:</Text>
              <Text style={styles.metricValue}>{summaryData.totalEvents}</Text>
            </View>
          </View>

          {/* Feature Usage */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Feature Usage</Text>
            {Object.entries(summaryData.featureUsage).map(([feature, count]) => (
              <View key={feature} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{feature}:</Text>
                <Text style={styles.metricValue}>{count}</Text>
              </View>
            ))}
          </View>

          {/* Event Counts */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Event Counts</Text>
            {Object.entries(summaryData.eventCounts).map(([eventType, count]) => (
              <View key={eventType} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{eventType}:</Text>
                <Text style={styles.metricValue}>{count}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
              <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSubmitFeedback}>
              <Text style={styles.actionButtonText}>Submit Analytics to Developer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
  },
  card: {
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
  },
  metricLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.sm,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.medium,
  },
  actions: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  actionButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
  clearButton: {
    backgroundColor: theme.colors.incorrect,
  },
  clearButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
}); 