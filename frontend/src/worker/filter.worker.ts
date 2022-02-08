import { Umbra } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';

const ctx: Worker = self as any;

self.addEventListener(
  'message',
  function(e) {
    const worker_id = e.data.worker_id;
    const announcements = e.data.announcements;
    const spendingPublicKey = e.data.spendingPublicKey;
    const viewingPrivateKey = e.data.viewingPrivateKey;
    const results = [];
    for (let index = 0; index < announcements.length; index++) {
      const ann = announcements[index];
      const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
      if (isForUser) {
        results.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
      }
      ctx.postMessage({
        worker_id: worker_id,
        done: false,
        index: index,
        data: {},
      });
    }

    ctx.postMessage({
      worker_id: worker_id,
      done: true,
      index: announcements.length,
      data: results,
    });

    self.close();
  },
  false
);
