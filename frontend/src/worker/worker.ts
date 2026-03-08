import { AnnouncementDetail, KeyPair, UserAnnouncement, Umbra } from '@umbracash/umbra-js';
import { appendWorkerMatches, getWorkerCount, splitAnnouncements } from './controller-core';
import { WorkerAnnouncementMatch } from './filter-core';
import { createProgressAccumulator } from './progress';

type WorkerProgressMessage = {
  worker_id: number;
  done: false;
  processedCount: number;
};

type WorkerCompletionMessage = {
  worker_id: number;
  done: true;
  processedCount: number;
  data: WorkerAnnouncementMatch[];
};

type WorkerMessage = WorkerProgressMessage | WorkerCompletionMessage;

export const filterUserAnnouncements = (
  spendingPublicKey: string,
  viewingPrivateKey: string,
  announcements: AnnouncementDetail[],
  workers: Worker[],
  progress: (percentage: number) => void,
  completion: (userAnnouncements: UserAnnouncement[]) => void
) => {
  const userAnnouncements: UserAnnouncement[] = [];
  const spendingKeyPair = new KeyPair(spendingPublicKey);
  const viewingKeyPair = new KeyPair(viewingPrivateKey);

  if (announcements.length === 0) {
    completion(userAnnouncements);
    return;
  }

  if (!window.Worker) {
    // Current browser does not support web worker, so we gracefully degrade the scanning algorithm
    // to former one (i.e. setInterval()).
    const chunk = 10;
    let index = 0;
    let lastReportedPercentage = -1;
    const doChunk = () => {
      for (let count = chunk; count > 0 && index < announcements.length; count--, index++) {
        const ann = announcements[index];
        const { amount, from, receiver, timestamp, txHash } = ann;
        const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingKeyPair, viewingKeyPair, ann);
        const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
        if (isForUser) {
          userAnnouncements.push({
            randomNumber,
            receiver,
            amount,
            token: ann.token,
            from,
            txHash,
            timestamp,
            isWithdrawn,
          });
        }
      }

      if (index < announcements.length) {
        const percentage = Math.floor((100 * index) / announcements.length);
        if (percentage !== lastReportedPercentage) {
          lastReportedPercentage = percentage;
          progress(percentage);
        }
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
    const nCores = getWorkerCount(navigator.hardwareConcurrency, announcements.length);
    const progressStep = Math.max(Math.ceil(announcements.length / 100), 1);

    console.log(`[Worker] Cores: ${nCores}`);

    // split announcements into nCores sub lists
    const subAnnouncements = splitAnnouncements(announcements, nCores);

    // assign tasks to workers
    const updateProgress = createProgressAccumulator(nCores, announcements.length, progress);
    // Here we will initialize `nCores` workers by constructing `Worker()` imported from worker script `filter.worker.ts`
    for (let index = 0; index < nCores; index++) {
      workers.push(new Worker(new URL('./filter.worker.ts', import.meta.url)));
      // Here we add event listener to each worker to handle the case where it sends message to controller (i.e. worker.ts)
      workers[index].addEventListener('message', function (e: MessageEvent<WorkerMessage>) {
        const { worker_id, done, processedCount } = e.data;

        if (done) {
          appendWorkerMatches(userAnnouncements, subAnnouncements[worker_id], e.data.data);
        }

        const { isComplete } = updateProgress(worker_id, processedCount);

        if (isComplete) {
          completion(userAnnouncements);
        }
      });
      // Here we pass essential variables to each worker, letting them start computing.
      workers[index].postMessage({
        worker_id: index,
        announcements: subAnnouncements[index],
        spendingPublicKey: spendingPublicKey,
        viewingPrivateKey: viewingPrivateKey,
        progressStep,
      });
    }
  }
};
