// This is a worker script that can be controlled by `worker.ts`
// Be aware that this is not a module script, it is a *worker* script.

import { Announcement, Umbra } from '@umbracash/umbra-js';
import { getAddress } from 'src/utils/ethers';

// https://github.com/webpack-contrib/worker-loader#integrating-with-typescript
const ctx: Worker = self as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// This event listener will be triggered if the controller (i.e. worker.ts) post a message to this worker.
self.addEventListener(
  'message',
  function (e) {
    const worker_id = e.data.worker_id;
    const announcements = <Announcement[]>e.data.announcements;
    const spendingPublicKey = <string>e.data.spendingPublicKey;
    const viewingPrivateKey = <string>e.data.viewingPrivateKey;
    const results = [];
    for (let index = 0; index < announcements.length; index++) {
      const ann = announcements[index];
      const { token: tokenAddr } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      if (isForUser) {
        results.push({ index: index, randomNumber: randomNumber, token: token });
      }
      // Here we report the progress to the controller for interface updating.
      ctx.postMessage({
        worker_id: worker_id,
        done: false,
        index: index,
      });
    }

    // Here we post the computed results to the controller for aggregation/
    ctx.postMessage({
      worker_id: worker_id,
      done: true,
      index: announcements.length,
      data: results,
    });

    // Worker must be terminated once it finished working to avoid leakage.
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#terminating_a_worker
    self.close();
  },
  false
);
