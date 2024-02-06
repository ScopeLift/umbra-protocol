import { AnnouncementDetail, UserAnnouncement, Umbra } from '@umbracash/umbra-js';
import { getAddress } from 'src/utils/ethers';

export const filterUserAnnouncements = (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[],
  workers: Worker[],
  progress: (percentage: number) => void,
  completion: (userAnnouncements: UserAnnouncement[]) => void
) => {
  const userAnnouncements: UserAnnouncement[] = [];

  if (!window.Worker) {
    // Current browser does not support web worker, so we gracefully degrade the scanning algorithm
    // to former one (i.e. setInterval()).
    const chunk = 10;
    let index = 0;
    const doChunk = () => {
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
        progress((100 * index) / announcements.length);
        setTimeout(doChunk, 0);
      } else {
        completion(userAnnouncements);
      }
    };

    doChunk();
  } else {
    // Current browser supports web worker, will will employ multiple workers to collaboratively completing the
    // scanning task. The basic usage of web worker can be found at:
    //   - https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
    //   - https://webpack.js.org/guides/web-workers/
    // In a nutshell, this file (worker.ts) will act as a worker controller that controls real workers, including
    // initializing, passing message, receiving message and terminating.

    // navigator.hardwareConcurrency is not enabled in safari at compile time by default, but we know that WebKit
    // browsers clamp the max value for navigator.hardwareConcurrency to 2 on iOS and to 8 on others devices
    // https://caniuse.com/?search=hardwareConcurrency
    const nCores = navigator.hardwareConcurrency || 2;

    console.log(`[Worker] Cores: ${nCores}`);

    // split announcements into nCores sub lists
    const subAnnouncements: AnnouncementDetail[][] = Array.from(Array(nCores), () => []);
    for (let index = 0; index < announcements.length; index++) {
      subAnnouncements[index % nCores].push(announcements[index]);
    }

    // assign tasks to workers
    const progressRecorder: number[] = [];
    let progressSum = 0;
    // Here we will initialize `nCores` workers by constructing `Worker()` imported from worker script `filter.worker.ts`
    for (let index = 0; index < nCores; index++) {
      progressRecorder.push(0);
      workers.push(new Worker(new URL('./filter.worker.ts', import.meta.url)));
      // Here we add event listener to each worker to handle the case where it sends message to controller (i.e. worker.ts)
      workers[index].addEventListener('message', function (e: MessageEvent) {
        const worker_id = e.data.worker_id;
        const done = e.data.done;

        if (done) {
          e.data.data.forEach(function (data: { index: number; randomNumber: string; token: string }) {
            const { index, randomNumber, token } = data;
            const { amount, from, receiver, timestamp, txHash } = subAnnouncements[worker_id][index];
            const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
            userAnnouncements.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
          });
        }

        progressRecorder[worker_id] = e.data.index;
        progressSum = progressRecorder.reduce((lastSum, element) => lastSum + element, 0);

        if (progressSum < announcements.length) {
          progress((100 * progressSum) / announcements.length);
        } else {
          completion(userAnnouncements);
        }
      });
      // Here we pass essential variables to each worker, letting them start computing.
      workers[index].postMessage({
        worker_id: index,
        announcements: subAnnouncements[index],
        spendingPublicKey: spendingPublicKey,
        viewingPrivateKey: viewingPrivateKey,
      });
    }
  }
};
