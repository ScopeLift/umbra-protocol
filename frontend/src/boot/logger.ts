import { UmbraLogger } from 'components/logger';
import { LogLevel } from 'src/utils/ethers';

// Available log levels:
//   - 'DEBUG'
//   - 'INFO'
//   - 'WARNING'
//   - 'ERROR'
//   - 'OFF'
// Source: https://github.com/ethers-io/ethers.js/blob/d395d16fa357ec5dda9b59922cf21c39dc34c071/packages/logger/src.ts/index.ts#L44-L49
UmbraLogger.setLogLevel((process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG);

const version = '2.0.1'; // must match package.json version
const logger = new UmbraLogger(version);
window.logger = logger;
