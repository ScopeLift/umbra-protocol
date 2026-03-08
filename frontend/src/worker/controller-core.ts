/**
 * Shared worker-controller helpers kept outside the browser worker entrypoint so the logic
 * can be tested without relying on `import.meta.url` or a real Worker runtime.
 */

import { AnnouncementDetail, UserAnnouncement } from '@umbracash/umbra-js';
import { WorkerAnnouncementMatch } from './filter-core';

export const getWorkerCount = (hardwareConcurrency: number | undefined, announcementCount: number) => {
  if (announcementCount === 0) {
    return 0;
  }

  return Math.min(hardwareConcurrency || 2, announcementCount);
};

export const splitAnnouncements = (announcements: AnnouncementDetail[], workerCount: number) => {
  const subAnnouncements: AnnouncementDetail[][] = Array.from({ length: workerCount }, () => []);
  announcements.forEach((announcement, index) => {
    subAnnouncements[index % workerCount].push(announcement);
  });
  return subAnnouncements;
};

export const appendWorkerMatches = (
  userAnnouncements: UserAnnouncement[],
  announcements: AnnouncementDetail[],
  matches: WorkerAnnouncementMatch[]
) => {
  matches.forEach(({ index, randomNumber, token }) => {
    const { amount, from, receiver, timestamp, txHash } = announcements[index];
    userAnnouncements.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn: false });
  });
};
