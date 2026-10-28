import { Logger } from 'src/utils/ethers';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class UmbraLogger extends Logger {
  debug(...args: any[]) {
    super.debug(`${this.version} DEBUG -`, ...args);
  }
  info(...args: any[]) {
    super.info(`${this.version} INFO -`, ...args);
  }
  warn(...args: any[]) {
    super.warn(`${this.version} WARNING -`, ...args);
  }
}
