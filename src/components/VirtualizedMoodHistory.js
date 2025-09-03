import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { formatDate } from '../utils/dateUtils';

// Memoized mood entry component to prevent unnecessary re-renders
const MoodEntryItem = React.memo(({ item, onPress }) => {
  const moodIconMap = {
    1: 'sad-outline',
    2: 'sad',
    3: 'remove-circle',
    4: 'happy-outline',
    5: 'happy',
    6: 'heart',
    7: 'heart-circle',
    8: 'sunny',
    9: 'sunny-outline',
    10: 'star'
  };

  const moodColors = {
    1: colors.error,
    2: colors.error,
    3: colors.warning,
    4: colors.primary,
    5: colors.primary,
    6: colors.secondary,
    7: colors.secondary,
    8: colors.accent,
    9: colors.accent,
    10: colors.success
  };

  const moodLabels = {
    1: 'Very Low', 2: 'Low', 3: 'Somewhat Low',
    4: 'Moderate', 5: 'Good', 6: 'Very Good',
    7: 'Great', 8: 'Excellent', 9: 'Outstanding', 10: 'Perfect'
  };

  return (
    <TouchableOpacity
      style={styles.moodEntry}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryLeft}>
        <Ionicons
          name={moodIconMap[item.rating] || 'help-circle'}
          size={24}
          color={moodColors[item.rating] || colors.textSecondary}
        />
        <View style={styles.entryContent}>
          <Text style={styles.moodLabel}>
            {moodLabels[item.rating] || 'Unknown'}
          </Text>
          <Text style={styles.entryDate}>
            {formatDate(item.created_at || item.date)}
          </Text>
        </View>
      </View>

      <View style={styles.entryRight}>
        <View style={[styles.ratingBadge, { backgroundColor: moodColors[item.rating] || colors.surface }]}>
          <Text style={styles.ratingText}>{item.rating}/10</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
});

// Optimized mood history list with virtualization
const VirtualizedMoodHistory = React.memo(({
  data,
  loading = false,
  error = null,
  onEntryPress,
  onRefresh,
  refreshing = false,
  ListEmptyComponent,
  ListHeaderComponent
}) => {
  // Memoized render item to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }) => (
    <MoodEntryItem item={item} onPress={onEntryPress} />
  ), [onEntryPress]);

  // Memoized key extractor
  const keyExtractor = useCallback((item, index) =>
    item.id?.toString() || `${item.created_at}-${index}`, []
  );

  // Get item layout for better scroll performance
  const getItemLayout = useCallback((data, index) => ({
    length: 80, // Fixed height of mood entry
    offset: 80 * index,
    index,
  }), []);

  // Memoized styles to prevent recreation
  const listStyle = useMemo(() => ({
    ...styles.list,
    opacity: refreshing ? 0.7 : 1,
  }), [refreshing]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>
          Unable to load mood history
        </Text>
        <TouchableOpacity style={styles.retryButton}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      style={listStyle}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      removeClippedSubviews={true} // Performance optimization
      maxToRenderPerBatch={10} // Limit items rendered per batch
      updateCellsBatchingPeriod={50} // Reduce frequency of updates
      windowSize={21} // Number of items to keep in memory around visible area
      initialNumToRender={15} // Initial items to render
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent || (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No mood entries yet.{'\n'}Start tracking your mental wellness!
          </Text>
        </View>
      )}
    />
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  moodEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  entryContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  moodLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
});

export default VirtualizedMoodHistory;
