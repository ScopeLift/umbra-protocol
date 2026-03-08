/**
 * Pure announcement filtering logic used by the real worker and by tests.
 * Keeping the hot loop here makes the progress throttling and match behavior easy to verify.
 */

import { AnnouncementDetail, KeyPair, Umbra } from '@umbracash/umbra-js';

export type WorkerAnnouncementMatch = {
  index: number;
  randomNumber: string;
  token: string;
};

export const filterAnnouncements = (
  spendingKeyPair: KeyPair,
  viewingKeyPair: KeyPair,
  announcements: AnnouncementDetail[],
  progressStep: number,
  onProgress?: (processedCount: number) => void
) => {
  const results: WorkerAnnouncementMatch[] = [];
  const normalizedProgressStep = Math.max(progressStep, 1);

  for (let index = 0; index < announcements.length; index++) {
    const announcement = announcements[index];
    const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingKeyPair, viewingKeyPair, announcement);
    if (isForUser) {
      results.push({ index, randomNumber, token: announcement.token });
    }

    const processedCount = index + 1;
    if (onProgress && processedCount < announcements.length && processedCount % normalizedProgressStep === 0) {
      onProgress(processedCount);
    }
  }

  return results;
};
