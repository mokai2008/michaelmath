export interface ProgressTopic {
  id: string;
  progress_percentage?: number | string | null;
  content_items?: any[];
}

/**
 * Extracts a numeric progress percentage weight from a topic.
 * Checks both `progress_percentage` column and fallback inside `content_items`.
 */
export function getTopicWeight(t?: ProgressTopic | null): number {
  if (!t) return 0;
  if (t.progress_percentage !== undefined && t.progress_percentage !== null && t.progress_percentage !== '') {
    const parsed = parseFloat(String(t.progress_percentage).replace('%', '').trim());
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  // Check fallback in content_items
  if (Array.isArray(t.content_items)) {
    const meta = t.content_items.find((i: any) => i?.__topic_meta);
    if (meta && meta.progress_percentage !== undefined && meta.progress_percentage !== null && meta.progress_percentage !== '') {
      const parsed = parseFloat(String(meta.progress_percentage).replace('%', '').trim());
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  }
  return 0;
}

/**
 * Calculates the overall progress percentage of a course based on its topics and completed topic IDs.
 * Strictly adheres to the admin weight scale:
 * - If any topic in the course has a custom weight > 0, course progress is the direct cumulative
 *   sum of completed topic weights (e.g. topic 1 at 1% -> 1% progress when completed).
 * - If all topics in the course are completed, progress is 100%.
 * - If no custom weights are defined (all 0 or unset), it falls back to equal weighting: (completed / total) * 100.
 */
export function calculateCourseProgress(
  topics: ProgressTopic[] = [],
  completedTopicIds: Set<string> | string[] = []
): {
  progressPercentage: number;
  completedCount: number;
  totalCount: number;
} {
  if (!Array.isArray(topics)) {
    return { progressPercentage: 0, completedCount: 0, totalCount: 0 };
  }
  const validTopics = topics.filter((t) => t && t.id);
  const compSet = completedTopicIds instanceof Set ? completedTopicIds : new Set(Array.isArray(completedTopicIds) ? completedTopicIds : []);
  const totalCount = validTopics.length;

  if (totalCount === 0) {
    return { progressPercentage: 0, completedCount: 0, totalCount: 0 };
  }

  const completedTopics = validTopics.filter((t) => compSet.has(t.id));
  const completedCount = completedTopics.length;

  // If all topics in the course are completed, guaranteed 100%
  if (completedCount === totalCount) {
    return { progressPercentage: 100, completedCount, totalCount };
  }

  // Check if course uses custom admin topic weighting
  const hasCustomWeights = validTopics.some((t) => getTopicWeight(t) > 0);

  if (hasCustomWeights) {
    // Strictly sum the explicit weights configured by the admin
    const completedWeight = completedTopics.reduce(
      (sum, t) => sum + getTopicWeight(t),
      0
    );
    const rawVal = Math.round(completedWeight * 10) / 10;
    const cleanVal = rawVal % 1 === 0 ? Math.round(rawVal) : rawVal;
    // Cap at 99% until all topics are completed
    const pct = Math.min(99, Math.max(0, cleanVal));
    return { progressPercentage: pct, completedCount, totalCount };
  }

  // Fallback: Equal weighting across all topics when tutor has not set custom weights
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
