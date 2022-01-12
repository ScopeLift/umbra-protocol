import { AnnouncementDetail, UserAnnouncement, Umbra } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';

export const filterUserAnnouncements = async (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[]
) => {
  const checkPromises = announcements.map((ann) => {
    return new Promise((resolve) => {
      const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
      if (isForUser) {
        setTimeout(() => resolve({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn }), 1);
      } else {
        setTimeout(() => resolve(false), 1);
      }
    });
  });

  const checkedAnnouncements = await Promise.all(checkPromises);
  const filteredAnnouncements = checkedAnnouncements.filter((ann) => !!ann);

  return filteredAnnouncements as UserAnnouncement[];
};
