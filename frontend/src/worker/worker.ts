import { AnnouncementDetail, UserAnnouncement, Umbra } from '@umbra/umbra-js';
import { getAddress } from 'src/utils/ethers';
import Worker from 'worker-loader!./filter.worker';

export const filterUserAnnouncements = (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[],
  progress: (percentage: number) => void,
  completion: (userAnnouncements: UserAnnouncement[]) => void
) => {
  const userAnnouncements: UserAnnouncement[] = [];
  let index = 0;

  if (!window.Worker) {
    const chunk = 10;
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
    // navigator.hardwareConcurrency is not enabled in safari at compile time by default, but we know that WebKit
    // browsers clamp the max value for navigator.hardwareConcurrency to 2 on iOS and to 8 on others devices
    // https://caniuse.com/?search=hardwareConcurrency
    let nCores = 2;
    if (navigator.hardwareConcurrency) {
      nCores = navigator.hardwareConcurrency;
    }

    console.log(`[Worker] Cores: ${nCores}`);

    // split announcements into nCores sub lists
    const subAnnouncements: AnnouncementDetail[][] = Array.from(Array(nCores), () => []);
    for (; index < announcements.length; index++) {
      subAnnouncements[index % nCores].push(announcements[index]);
    }
    index = 0;

    // assign tasks to workers
    const workers: Worker[] = [];
    const progressRecorder: number[] = [];
    let progressSum = 0;
    for (; index < nCores; index++) {
      progressRecorder.push(0);
      workers.push(new Worker());
      workers[index].addEventListener('message', function(e: MessageEvent) {
        const worker_id = e.data.worker_id;
        const done = e.data.done;

        if (done) {
          e.data.data.forEach(function(data: any) {
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
      workers[index].postMessage({
        worker_id: index,
        announcements: subAnnouncements[index],
        spendingPublicKey: spendingPublicKey,
        viewingPrivateKey: viewingPrivateKey,
      });
    }
  }
};
