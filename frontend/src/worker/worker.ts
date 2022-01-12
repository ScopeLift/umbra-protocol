import { AnnouncementDetail, UserAnnouncement, Umbra } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';

export const filterUserAnnouncements = async (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[]
) => {

  
  const userAnnouncements: UserAnnouncement[] = [];
  let index = 0;
  const chunk = 10;

  const doChunk = async () => {
    for (let count = chunk; count > 0 && index < announcements.length; count--, index++) {
      const ann = announcements[index];
      const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
      if (isForUser) {
        userAnnouncements.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
      }
    }

    if (index < announcements.length) {
      const prom = new Promise(function(resolve) {
        setTimeout(() => {
          doChunk();
          resolve(null);
        }, 1);
      });

      await prom;
    }
  }

  await doChunk();

  return userAnnouncements;
};
