/**
 * @jest-environment jsdom
 */

// Worker-side logic is split into pure helpers so we can verify progress throttling and aggregation
// without importing the browser worker entrypoint itself.

import { ethers } from 'ethers';
import { AnnouncementDetail, KeyPair, RandomNumber, Umbra, UserAnnouncement } from '@umbracash/umbra-js';
import { getAddress } from 'src/utils/ethers';
import { appendWorkerMatches, getWorkerCount, splitAnnouncements } from 'src/worker/controller-core';
import { filterAnnouncements } from 'src/worker/filter-core';
import { createProgressAccumulator } from 'src/worker/progress';

const MATCH_RANDOM_NUMBER = `0x${'11'.repeat(32)}`;
const MATCHED_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function createAnnouncement(isMatch: boolean, wallet: ethers.Wallet) {
  const viewingKeyPair = new KeyPair(wallet.privateKey);
  const spendingKeyPair = new KeyPair(wallet.publicKey);
  const randomNumber = new RandomNumber();
  const encrypted = viewingKeyPair.encrypt(randomNumber);
  const { pubKeyXCoordinate } = KeyPair.compressPublicKey(encrypted.ephemeralPublicKey);

  return {
    announcement: {
      amount: ethers.constants.One,
      block: '1',
      ciphertext: encrypted.ciphertext,
      from: isMatch ? wallet.address : ethers.Wallet.createRandom().address,
      pkx: pubKeyXCoordinate,
      receiver: spendingKeyPair.mulPublicKeyToAddress(randomNumber),
      timestamp: '1',
      token: MATCHED_TOKEN.toLowerCase(),
      txHash: ethers.Wallet.createRandom().privateKey,
    } as AnnouncementDetail,
    randomNumber: randomNumber.asHex,
  };
}

describe('worker filtering', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps worker progress updates bounded to roughly 100 per scan batch', () => {
    const wallet = ethers.Wallet.createRandom();
    const spendingKeyPair = new KeyPair(wallet.publicKey);
    const viewingKeyPair = new KeyPair(wallet.privateKey);
    const workerCount = 8;
    const announcements = Array.from({ length: 10_000 }, (_, index) => ({
      amount: ethers.constants.One,
      block: `${index}`,
      ciphertext: wallet.privateKey,
      from: wallet.address,
      pkx: '0x1',
      receiver: wallet.address,
      timestamp: `${index}`,
      token: MATCHED_TOKEN,
      txHash: wallet.privateKey,
    })) as AnnouncementDetail[];
    const progressStep = Math.max(Math.ceil(announcements.length / 100), 1);
    let progressMessages = 0;

    jest.spyOn(Umbra, 'isAnnouncementForUser').mockReturnValue({ isForUser: false, randomNumber: '' });

    const workerAnnouncements: AnnouncementDetail[][] = Array.from({ length: workerCount }, () => []);
    announcements.forEach((announcement, index) => {
      workerAnnouncements[index % workerCount].push(announcement);
    });

    workerAnnouncements.forEach((batch) => {
      filterAnnouncements(spendingKeyPair, viewingKeyPair, batch, progressStep, () => {
        progressMessages += 1;
      });
    });

    expect(progressMessages).toBeLessThanOrEqual(100);
  });

  it('dedupes aggregated progress updates by integer percentage', () => {
    const reportedPercentages: number[] = [];
    const updateProgress = createProgressAccumulator(2, 10, (percentage) => reportedPercentages.push(percentage));

    updateProgress(0, 1);
    updateProgress(0, 1);
    updateProgress(1, 1);
    updateProgress(1, 1);
    updateProgress(0, 5);
    updateProgress(1, 5);

    expect(reportedPercentages).toEqual([10, 20, 60]);
  });

  it('returns zero workers when there are no announcements to process', () => {
    expect(getWorkerCount(undefined, 0)).toBe(0);
  });

  it('aggregates worker completion results into final user announcements', () => {
    const wallet = ethers.Wallet.createRandom();
    const matching = createAnnouncement(true, wallet);
    const nonMatching = createAnnouncement(false, wallet);
    const announcements = [matching.announcement, nonMatching.announcement];
    const userAnnouncements: UserAnnouncement[] = [];
    const reportedPercentages: number[] = [];
    const workerCount = getWorkerCount(2, announcements.length);
    const updateProgress = createProgressAccumulator(workerCount, announcements.length, (percentage) =>
      reportedPercentages.push(percentage)
    );
    const workerAnnouncements = splitAnnouncements(announcements, workerCount);

    appendWorkerMatches(userAnnouncements, workerAnnouncements[0], [
      { index: 0, randomNumber: MATCH_RANDOM_NUMBER, token: getAddress(workerAnnouncements[0][0].token) },
    ]);
    expect(updateProgress(0, workerAnnouncements[0].length)).toEqual({ processedCountTotal: 1, isComplete: false });
    expect(updateProgress(1, workerAnnouncements[1].length)).toEqual({ processedCountTotal: 2, isComplete: true });

    expect(userAnnouncements).toEqual([
      {
        amount: matching.announcement.amount,
        from: matching.announcement.from,
        isWithdrawn: false,
        randomNumber: MATCH_RANDOM_NUMBER,
        receiver: matching.announcement.receiver,
        timestamp: matching.announcement.timestamp,
        token: getAddress(matching.announcement.token),
        txHash: matching.announcement.txHash,
      },
    ] as UserAnnouncement[]);
    expect(reportedPercentages).toEqual([50]);
  });
});
