import { AnnouncementDetail, UserAnnouncement, Umbra } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';

export const filterUserAnnouncements = (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[]
) => {
  const filteredAnnouncements = announcements.reduce((userAnns, ann) => {
    const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = ann;
    const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
    const token = getAddress(tokenAddr); // ensure checksummed address
    const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
    if (isForUser) userAnns.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
    return userAnns;
  }, [] as UserAnnouncement[]);

  return filteredAnnouncements;
};
