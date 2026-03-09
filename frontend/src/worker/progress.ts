/**
 * Aggregates per-worker progress into one percentage stream for the receive-page UI.
 * It only emits when the integer percentage changes to avoid redundant updates.
 */

/**
 * Creates a progress recorder that merges per-worker counts into one completion signal.
 */
export const createProgressAccumulator = (
  workerCount: number,
  totalAnnouncements: number,
  progress: (percentage: number) => void
) => {
  const progressRecorder = Array.from({ length: workerCount }, () => 0);
  let lastReportedPercentage = -1;

  return (workerId: number, processedCount: number) => {
    progressRecorder[workerId] = processedCount;
    const processedCountTotal = progressRecorder.reduce((sum, value) => sum + value, 0);
    const percentage = totalAnnouncements === 0 ? 100 : Math.floor((100 * processedCountTotal) / totalAnnouncements);

    if (processedCountTotal < totalAnnouncements && percentage !== lastReportedPercentage) {
      lastReportedPercentage = percentage;
      progress(percentage);
    }

    return { processedCountTotal, isComplete: processedCountTotal >= totalAnnouncements };
  };
};
