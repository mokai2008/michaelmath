export interface ProgressTopic {
  id: string;
  progress_percentage?: number | string | null;
}

/**
 * Calculates the overall progress percentage of a course based on its topics and completed topic IDs.
 * If topics have custom `progress_percentage` weights set (> 0), it sums the weights of completed topics
 * relative to the total allocated weight (or directly if total is ~100%).
 * If no custom weights are defined (or all 0), it falls back to equal weighting: (completed / total) * 100.
 */
export function calculateCourseProgress(
  topics: ProgressTopic[],
  completedTopicIds: Set<string> | string[]
): {
  progressPercentage: number;
  completedCount: number;
  totalCount: number;
} {
  const compSet = completedTopicIds instanceof Set ? completedTopicIds : new Set(completedTopicIds);
  const totalCount = topics.length;

  if (totalCount === 0) {
    return { progressPercentage: 0, completedCount: 0, totalCount: 0 };
  }

  const completedTopics = topics.filter((t) => compSet.has(t.id));
  const completedCount = completedTopics.length;

  // If all topics are completed, guaranteed 100%
  if (completedCount === totalCount) {
    return { progressPercentage: 100, completedCount, totalCount };
  }

  // Calculate total custom weight
  const totalWeight = topics.reduce((sum, t) => sum + (parseFloat(String(t.progress_percentage || 0)) || 0), 0);

  if (totalWeight > 0) {
    const completedWeight = completedTopics.reduce(
      (sum, t) => sum + (parseFloat(String(t.progress_percentage || 0)) || 0),
      0
    );
    const ratio = completedWeight / totalWeight;
    const pct = Math.min(99, Math.max(0, Math.round(ratio * 100)));
    return { progressPercentage: pct, completedCount, totalCount };
  }

  // Fallback: Equal weighting across all topics
  const pct = Math.min(99, Math.max(0, Math.round((completedCount / totalCount) * 100)));
  return { progressPercentage: pct, completedCount, totalCount };
}

/**
 * Splits 100% equally across an array of items, ensuring the sum is exactly 100%.
 */
export function distributeEqualPercentages(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];

  const basePercent = Math.floor((100 / count) * 10) / 10;
  let remaining = Math.round((100 - basePercent * count) * 10) / 10;

  return Array.from({ length: count }, (_, idx) => {
    let bonus = 0;
    if (remaining > 0.05) {
      bonus = 0.1;
      remaining = Math.round((remaining - 0.1) * 10) / 10;
    }
    return Number((basePercent + bonus).toFixed(1));
  });
}
