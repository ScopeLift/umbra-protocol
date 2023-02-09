import { Logger } from 'src/utils/ethers';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class UmbraLogger extends Logger {
  debug(...args: any[]) {
    super.debug(`v${this.version} DEBUG -`, ...args);
  }
  info(...args: any[]) {
    super.info(`v${this.version} INFO -`, ...args);
  }
  warn(...args: any[]) {
    super.warn(`v${this.version} WARNING -`, ...args);
  }
}
