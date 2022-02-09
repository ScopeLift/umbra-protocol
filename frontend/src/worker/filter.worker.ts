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
      const { token: tokenAddr } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      if (isForUser) {
        results.push({ index: index, randomNumber: randomNumber, token: token });
      }
      ctx.postMessage({
        worker_id: worker_id,
        done: false,
        index: index,
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
