/**
 * @dev Assortment of helper methods
 */

import {
  AddressZero,
  BigNumber,
  computeAddress,
  Contract,
  Event,
  getAddress,
  HashZero,
  isHexString,
  keccak256,
  Overrides,
  resolveProperties,
  serialize as serializeTransaction,
  splitSignature,
  StaticJsonRpcProvider,
  UnsignedTransaction,
} from '../ethers';
import { Point, Signature, utils as nobleUtils } from '@noble/secp256k1';
import { ens, cns } from '..';
import { default as Resolution } from '@unstoppabledomains/resolution';
import { StealthKeyRegistry } from '../classes/StealthKeyRegistry';
import { TxHistoryProvider } from '../classes/TxHistoryProvider';
import { EthersProvider, TransactionResponseExtended } from '../types';
import { StealthKeyChangedEvent } from 'src/typechain/contracts/StealthKeyRegistry';

// Lengths of various properties when represented as full hex strings
export const lengths = {
  address: 42, // 20 bytes + 0x prefix
  txHash: 66, // 32 bytes + 0x prefix
  privateKey: 66, // 32 bytes + 0x prefix
  publicKey: 132, // 64 bytes + 0x04 prefix
};

// Define addresses that should never be used as the stealth address. If you're sending to these a mistake was
// made somewhere and the funds will not be accessible. Ensure any addresses added to this list are checksum addresses
export const invalidStealthAddresses = [
  AddressZero,
  '0xdcc703c0E500B653Ca82273B7BFAd8045D85a470', // generated from hashing an empty public key, e.g. keccak256('0x')
  '0x59274E3aE531285c24e3cf57C11771ecBf72d9bf', // generated from hashing the zero public key, e.g. keccak256('0x000...000')
].map(getAddress);

/**
 * @notice Given a transaction hash, return the public key of the transaction's sender
 * @dev See https://github.com/ethers-io/ethers.js/issues/700 for an example of
 * recovering public key from a transaction with ethers
 * @param txHash Transaction hash to recover public key from
 * @param provider ethers provider instance
 */
export async function recoverPublicKeyFromTransaction(txHash: string, provider: EthersProvider) {
  // Get transaction data
  if (typeof txHash !== 'string' || txHash.length !== lengths.txHash) {
    throw new Error('Invalid transaction hash provided');
  }
  const tx = await getTransactionByHash(txHash, provider);
  if (!tx) {
    throw new Error('Transaction not found. Are the provider and transaction hash on the same network?');
  }

  // Reconstruct transaction payload that was originally signed. Relevant EIPs:
  //   - https://eips.ethereum.org/EIPS/eip-155  (EIP-155: Simple replay attack protection)
  //   - https://eips.ethereum.org/EIPS/eip-2718 (EIP-2718: Typed Transaction Envelope)
  //   - https://eips.ethereum.org/EIPS/eip-2930 (EIP-2930: Optional access lists)
  //   - https://eips.ethereum.org/EIPS/eip-1559 (EIP-1559: Fee market change for ETH 1.0 chain)
  //
  // Properly defining the `txData` signed by the sender is essential to ensuring sent funds can be
  // accessed by the recipient. This only affects the "advanced mode" option of sending directly
  // to a recipient's standard public key, i.e. is does not affect users sending via the
  // recommended approach of the StealthKeyRegistry.
  //
  // Any time a new transaction type is added to Ethereum, the below will need to be updated to
  // support that transaction type
  const txData: UnsignedTransaction = {};

  // First we add fields that are always required
  txData.type = tx.type;
  txData.nonce = tx.nonce;
  txData.gasLimit = tx.gasLimit;
  txData.to = tx.to;
  txData.value = tx.value;
  txData.data = tx.data;
  if (tx.chainId) {
    txData.chainId = tx.chainId;
  }

  // Now we add fields specific to the transaction type
  if (tx.type === 0 || !tx.type) {
    // LegacyTransaction is rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])
    txData.gasPrice = tx.gasPrice;
  } else if (tx.chainId === 42161 && tx.type === 120) {
    // This block is for handling Classic (pre-Nitro) transactions on Arbitrum. If given a legacy
    // transaction hash on Arbitrum, when querying a Nitro node for that pre-nitro tx, the type
    // should be 120. However, if you query classic node for the data, the type would be 0.
    // Different RPC providers handle this differently. For example, `https://arb1.arbitrum.io/rpc`
    // and Infura will return type 120, but Alchemy will return type 0. If type 0 is returned, it's
    // handled by the previous block. If type 120 is returned, we handle it here. This block is
    // required since ethers.js v5 won't serialize transactions unless the `type` is null,  0, 1,
    // or 2, as seen here:
    //   https://github.com/ethers-io/ethers.js/blob/aaf40a1ccedd2664041938f1541d8a0fc3b8ae4d/packages/transactions/src.ts/index.ts#L305-L328
    // These transactions can be serialized the same way as legacy type 0 transactions, so we just
    // override the type here. For reference, the arbitrum transaction type definitions can be
    // found here:
    //  https://github.com/OffchainLabs/go-ethereum/blob/141b0fcdf0e4d8e9e5de3f0466533b86563f2d29/core/types/transaction.go#L54.

    // LegacyTransaction is rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])
    txData.gasPrice = tx.gasPrice;
    txData.type = 0;
  } else if (tx.type === 1) {
    // 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s])
    txData.gasPrice = tx.gasPrice;
    txData.accessList = tx.accessList;
  } else if (tx.type === 2) {
    // 0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList, v, r, s])
    txData.accessList = tx.accessList;
    txData.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    txData.maxFeePerGas = tx.maxFeePerGas;
  } else {
    throw new Error(`Unsupported transaction type: ${tx.type}`);
  }

  // Properly format transaction payload to get the correct message
  const resolvedTx = await resolveProperties(txData);
  const rawTx = serializeTransaction(resolvedTx);
  const msgHash = keccak256(rawTx);

  // Recover sender's public key.
  // Even though the type definitions say v,r,s are optional, they will always be defined: https://github.com/ethers-io/ethers.js/issues/1181
  const signature = new Signature(BigInt(tx.r!), BigInt(tx.s!));
  signature.assertValidity();
  const recoveryParam = splitSignature({ r: tx.r as string, s: tx.s, v: tx.v }).recoveryParam;
  const publicKey = Point.fromSignature(msgHash.slice(2), signature, recoveryParam);
  publicKey.assertValidity();

  // Verify that recovered public key derives to the transaction from address.
  const publicKeyHex = `0x${publicKey.toHex()}`;
  if (computeAddress(publicKeyHex) !== tx.from) {
    throw new Error('Public key not recovered properly');
  }
  return publicKeyHex;
}

/**
 * @notice Returns the transaction hash of the first transaction sent by an address, or
 * undefined if none was found
 * @param address Address to lookup
 * @param provider ethers provider instance
 */
export async function getSentTransaction(address: string, ethersProvider: EthersProvider) {
  address = getAddress(address); // address input validation
  const { chainId } = await ethersProvider.getNetwork();
  const txHistoryProvider = new TxHistoryProvider(chainId);
  const history = await txHistoryProvider.getHistory(address);
  let txHash;
  // Use the first transaction found
  for (let i = 0; i < history.length; i += 1) {
    const tx = history[i];
    if (tx.from === address) {
      // On Arbitrum, we need to make sure this is actually a signed transaction that we can recover a public key
      // from, since not all transactions returned by Etherscan are actually signed transactions: some are just
      // messages. This is a bit inefficient since it's an additional RPC call, and this method just returns the
      // txHash instead of the full transaction data, so we end up  making the same RPC call again later, but
      // that's ok for now. We identify signed transactions by just looking for the presence of a signature.
      if (chainId === 42161) {
        const txData = await getTransactionByHash(tx.hash, ethersProvider);
        const isSignedTx = txData.r !== HashZero && txData.s !== HashZero;
        if (!isSignedTx) continue;
      }
      txHash = tx.hash;
      break;
    }
  }
  return txHash;
}

// Takes an ENS, CNS, or address, and returns the checksummed address
export async function toAddress(name: string, provider: EthersProvider) {
  // If the name is already an address, just return it.
  if (name.length === lengths.address && isHexString(name)) return getAddress(name);

  // First try ENS
  let address: string | null = null;
  address = await resolveEns(name, provider); // Will never throw, but returns null on failure
  if (address) return address;

  // Then try CNS
  address = await resolveCns(name); // Will never throw, but returns null on failure
  if (address) return address;

  // At this point, we were unable to resolve the name to an address.
  throw new Error(
    `Please verify the provided name or address of '${name}' is correct. If providing an ENS name, ensure it is registered, and has a valid address record.`
  );
}

/**
 * @notice Returns public keys from the recipientId
 * @dev When providing a public key, transaction hash, or address with advanced mode, the spending and viewing
 * public keys will be the same. Only keys retrieved from the StealthKeyRegistry will have different spending
 * and viewing keys
 * @param id Recipient identifier, must be an ENS name, CNS name, address, transaction hash, or public key
 * @param provider ethers provider to use
 * @param options Object containing lookup options:
 *   advanced: looks for public keys in StealthKeyRegistry when false, recovers them from on-chain transaction when true
 *   supportPubKey: default false, when true allows a public key to be provided directly
 *   supportTxHash: default false, when true allows public key to be recovered from the specified transaction hash
 */
export async function lookupRecipient(
  id: string,
  provider: EthersProvider,
  {
    advanced,
    supportPubKey,
    supportTxHash,
  }: { advanced?: boolean; supportPubKey?: boolean; supportTxHash?: boolean } = {}
) {
  // Check if identifier is a public key. If so we just return that directly
  const isPublicKey = id.length === 132 && isHexString(id);
  if (supportPubKey && isPublicKey) {
    assertValidPoint(id);
    return { spendingPublicKey: id, viewingPublicKey: id };
  }

  // Check if identifier is a transaction hash. If so, we recover the sender's public keys from the transaction
  const isTxHash = id.length === 66 && isHexString(id);
  if (supportTxHash && isTxHash) {
    const publicKey = await recoverPublicKeyFromTransaction(id, provider);
    assertValidPoint(publicKey);
    return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
  }

  // The remaining checks are dependent on the advanced mode option. The provided identifier is now either an
  // ENS name, CNS name, or address, so we resolve it to an address
  const address = await toAddress(id, provider); // throws if an invalid address is provided

  // If we're not using advanced mode, use the StealthKeyRegistry
  if (!advanced) {
    const registry = new StealthKeyRegistry(provider);
    return registry.getStealthKeys(address);
  }

  // Otherwise, get public key based on the most recent transaction sent by that address
  const txHash = await getSentTransaction(address, provider);
  if (!txHash) throw new Error('Could not get public key because the provided account has not sent any transactions');
  const publicKey = await recoverPublicKeyFromTransaction(txHash, provider);
  assertValidPoint(publicKey);
  return { spendingPublicKey: publicKey, viewingPublicKey: publicKey };
}

export async function getBlockNumberUserRegistered(address: string, provider: StaticJsonRpcProvider) {
  address = getAddress(address); // address input validation
  const registry = new StealthKeyRegistry(provider);
  const filter = registry._registry.filters.StealthKeyChanged(address, null, null, null, null);
  try {
    const timeout = (ms: number) => new Promise((reject) => setTimeout(() => reject(new Error('timeout')), ms));
    const stealthKeyLogsPromise = registry._registry.queryFilter(filter);
    const stealthKeyLogs = (await Promise.race([stealthKeyLogsPromise, timeout(3000)])) as StealthKeyChangedEvent[];
    const registryBlock = sortStealthKeyLogs(stealthKeyLogs)[0]?.blockNumber || undefined;
    return registryBlock;
  } catch {
    return undefined;
  }
}

// Sorts stealth key logs in ascending order by block number
export function sortStealthKeyLogs(stealthKeyLogs: Event[]) {
  return stealthKeyLogs.sort(function (a, b) {
    return a.blockNumber - b.blockNumber;
  });
}

/**
 * @notice Throws if provided public key is not on the secp256k1 curve
 * @param point Uncompressed public key as hex string
 */
export function assertValidPoint(point: string) {
  const isCorrectLength = point.length === 130 || point.length === 132;
  const isCorrectFormat = typeof point === 'string' && isCorrectLength;
  if (!isCorrectFormat) throw new Error('Must provide uncompressed public key as hex string');

  const pointInstance = Point.fromHex(point.length === 130 ? point : point.slice(2));
  pointInstance.assertValidity();
}

/**
 * @notice Throws if provided private key is not valid.
 * @param point Private key as hex string
 */
export function assertValidPrivateKey(key: string) {
  const isCorrectLength = key.length === 64 || key.length === 66;
  const isCorrectFormat = typeof key === 'string' && isCorrectLength;
  if (!isCorrectFormat) throw new Error('Must provide private key as hex string');

  if (key.length === 66) key = key.slice(2);
  if (!nobleUtils.isValidPrivateKey(key)) throw new Error('Invalid private key');
}

/**
 * @notice Returns the public keys associated with the provided name, using the legacy lookup approach.
 * @param name Name or domain to test
 * @param provider ethers provider instance
 */
export async function getPublicKeysLegacy(name: string, provider: EthersProvider) {
  if (!isDomain(name)) throw new Error(`Name ${name} is not a valid domain`);
  try {
    // First try ENS (throws on failure)
    return ens.getPublicKeys(name, provider);
  } catch (e) {
    // Fallback to CNS
    return cns.getPublicKeys(name, provider, getResolutionInstance());
  }
}

/**
 * @notice Returns true if the provided name is a valid domain, without the protocol identifier such as https://
 * @param name Name or domain to test
 */
export function isDomain(name: string) {
  const regex = /^([a-z0-9|-]+\.)*[a-z0-9|-]+\.[a-z]+$/; // https://stackoverflow.com/questions/8959765/need-regex-to-get-domain-subdomain/8959842
  return regex.test(name);
}

// --- Private helper methods ---

/**
 * @notice Returns an instance of the UD Resolution library
 */

function getResolutionInstance() {
  return new Resolution({
    sourceConfig: {
      uns: {
        locations: {
          Layer1: {
            url: String(process.env.MAINNET_RPC_URL),
            network: 'mainnet',
          },
          Layer2: {
            url: String(process.env.POLYGON_RPC_URL),
            network: 'polygon-mainnet',
          },
        },
      },
    },
  });
}

/**
 * @notice Attempt to resolve an ENS name, and return null on failure
 * @param name Name to resolve
 * @param provider Provider connected to mainnet. If the provider is connected to a different
 * network, we use the umbra-js default provider instead
 * @returns
 */
async function resolveEns(name: string, provider: EthersProvider) {
  try {
    // Ensure we have a mainnet provider by using the provided provider if it's connected to mainnet,
    // and overriding with a mainnet provider otherwise. This ensures ENS resolution is always done
    // against L1, as explained here: https://twitter.com/makoto_inoue/status/1453737962110275598
    const { chainId } = await provider.getNetwork();
    if (chainId !== 1) provider = new StaticJsonRpcProvider(String(process.env.MAINNET_RPC_URL));
    const address = await provider.resolveName(name);
    return address || null;
  } catch (e) {
    return null;
  }
}

/**
 * @notice Attempt to resolve a CNS name, and return null on failure
 * @param name
 * @returns
 */
async function resolveCns(name: string) {
  try {
    const resolution = getResolutionInstance();
    const address = await resolution.addr(name, 'ETH');
    return getAddress(address) || null;
  } catch (e) {
    return null;
  }
}

/**
 * @notice Given a from address, to address, and provider, return parameters needed to sweep all ETH
 * @dev The intent of this method is to facilitate sweeping ETH from a stealth address (EOA) to another
 * account. As a result, we don't consider the chance of the sender being a contract wallet that
 * results in extra gas costs.
 * @param from Address sending ETH
 * @param to Address receiving ETH
 * @param provider Provider to use for querying data
 * @param overrides Optional overrides for gasLimit and gasPrice
 */
export async function getEthSweepGasInfo(
  from: string,
  to: string,
  provider: EthersProvider,
  overrides: Overrides = {}
): Promise<{
  gasPrice: BigNumber;
  gasLimit: BigNumber;
  txCost: BigNumber;
  fromBalance: BigNumber;
  ethToSend: BigNumber;
  chainId: number;
}> {
  const gasLimitOf21k = [1, 4, 5, 10, 100, 137, 1337, 11155111]; // networks where ETH sends cost 21000 gas
  const ignoreGasPriceOverride = [10, 42161]; // to maximize ETH sweeps, ignore uer-specified gasPrice overrides

  const [toAddressCode, network, fromBalance, lastBlockData, providerGasPrice] = await Promise.all([
    provider.getCode(to),
    provider.getNetwork(),
    provider.getBalance(from),
    provider.getBlock('latest'),
    // We use `getGasPrice` instead of `getFeeData` because:
    // (a) getGasPrice returns low estimates whereas getFeeData intentionally returns high estimates
    //     of gas costs, since the latter presumes the post-1559 pricing model in which extra fees
    //     are refunded; we don't want there to be any refunds since we're trying to sweep the account;
    // (b) not all chains support getFeeData and/or 1559 gas pricing, e.g. Avalanche and Optimism.
    provider.getGasPrice(),
  ]);
  const isEoa = toAddressCode === '0x';
  const { chainId } = network;

  // If a gas limit was provided, use it. Otherwise, if we are sending to an EOA and this is a network where ETH
  // transfers always to cost 21000 gas, use 21000. Otherwise, estimate the gas limit.
  const gasLimit = overrides.gasLimit
    ? BigNumber.from(await overrides.gasLimit)
    : isEoa && gasLimitOf21k.includes(chainId)
    ? BigNumber.from('21000')
    : await provider.estimateGas({ gasPrice: 0, to, from, value: fromBalance });

  // Estimate the gas price, defaulting to the given one unless on a network where we want to use provider gas price
  let gasPrice = ignoreGasPriceOverride.includes(chainId)
    ? providerGasPrice
    : BigNumber.from((await overrides.gasPrice) || providerGasPrice);

  // On networks with EIP-1559 gas pricing, the provider will throw an error and refuse to submit
  // the tx if the gas price is less than the block-specified base fee. The error is "max fee
  // per gas less than block base fee". So we need to ensure that the low estimate we're using isn't
  // *too* low. Additionally, if the previous block exceeded the target size, the base fee will be
  // increased by 12.5% for the next block, per:
  //   https://ethereum.org/en/developers/docs/gas/#base-fee
  // To be conservative, therefore, we assume a 12.5% increase will affect the base fee for the
  // transaction we're about to send.
  const baseGasFee = (lastBlockData?.baseFeePerGas || BigNumber.from('0')).mul('1125').div('1000');
  if (gasPrice.lt(baseGasFee)) gasPrice = baseGasFee;

  // For networks with a lot of gas market volatility, we bump the gas price to
  // give us a bit of wiggle room.
  let gasPriceScaleFactor;
  switch (chainId) {
    case 42161:
      gasPriceScaleFactor = '110';
      break;
    default:
      gasPriceScaleFactor = '105';
  }
  gasPrice = gasPrice.mul(gasPriceScaleFactor).div('100');

  let txCost = gasPrice.mul(gasLimit);

  // On Optimism, we ask the gas price oracle for the L1 data fee that we should add on top of the L2 execution
  // cost: https://community.optimism.io/docs/developers/build/transaction-fees/
  // For Arbitrum, this is baked into the gasPrice returned from the provider.
  if (chainId === 10) {
    const nonce = await provider.getTransactionCount(from);
    const gasOracleAbi = ['function getL1Fee(bytes memory _data) public view returns (uint256)'];
    const gasPriceOracle = new Contract('0x420000000000000000000000000000000000000F', gasOracleAbi, provider);
    let l1FeeInWei = await gasPriceOracle.getL1Fee(
      serializeTransaction({ to, value: fromBalance, data: '0x', gasLimit, gasPrice, nonce })
    );

    // We apply a 70% multiplier to the Optimism oracle quote, since it's frequently low
    // by 45+% compared to actual L1 send fees.
    l1FeeInWei = (l1FeeInWei as BigNumber).mul('170').div('100');

    txCost = txCost.add(l1FeeInWei as BigNumber);
  }

  // Return the gas price, gas limit, and the transaction cost
  return { gasPrice, gasLimit, txCost, fromBalance, ethToSend: fromBalance.sub(txCost), chainId };
}

/**
 * @notice Similar to ethers.getTransaction(txHash), but does not filter out non-standard fields
 * like getTransaction does
 * @dev Based on https://github.com/ethers-io/ethers.js/blob/ef1b28e958b50cea7ff44da43b3c5ff054e4b483/packages/providers/src.ts/base-provider.ts#L1832
 */
async function getTransactionByHash(txHash: string, provider: EthersProvider): Promise<TransactionResponseExtended> {
  // Initial response contains all fields, including non-standard fields.
  const params = { transactionHash: provider.formatter.hash(txHash, true) };
  const fullTx = await provider.perform('getTransaction', params);
  if (!fullTx) {
    throw new Error('Transaction hash not found. Are the provider and transaction hash on the same network?'); // prettier-ignore
  }
  // We use the formatter to parse values into the types ethers normally returns, but this strips non-standard fields.
  const partialTx = <TransactionResponseExtended>provider.formatter.transactionResponse(fullTx);
  // Now we add back the missing fields, with custom typing by field.
  const bigNumberFields = new Set(['gas']); // ethers renames this to gasLimit, but for completeness we add `gas` back.
  const numberFields = new Set([
    // Arbitrum.
    'arbSubType',
    'arbType',
    'indexInParent',
    'l1BlockNumber',
    // Optimism.
    'index',
    'l1BlockNumber',
    'l1Timestamp',
    'queueIndex',
  ]);
  const tx = <TransactionResponseExtended>{ ...partialTx };
  const existingFields = new Set(Object.keys(tx));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Object.keys(fullTx).forEach((key) => {
    // Do nothing if this field already exists (i.e. it was formatted by the ethers formatter).
    if (existingFields.has(key)) return;
    // Otherwise, add the field and format it
    if (bigNumberFields.has('key')) {
      tx.gas = fullTx[key] ? BigNumber.from(fullTx[key]) : null;
    } else if (numberFields.has(key)) {
      tx[key] = fullTx[key] ? BigNumber.from(fullTx[key]).toNumber() : null;
    } else {
      tx[key] = fullTx[key];
    }
  });
  return tx;
}

// --- Compliance ---
export async function assertSupportedAddress(recipientId: string) {
  const [isSupported] = await checkSupportedAddresses([recipientId]);
  if (!isSupported) throw new Error('Address is invalid or unavailable');
}

export async function checkSupportedAddresses(recipientIds: string[]) {
  // Check for public key being passed in, and if so derive the corresponding address.
  recipientIds = recipientIds.map((recipientId) => {
    if (isHexString(recipientId) && recipientId.length == 132) {
      return computeAddress(recipientId); // Get address from public key.
    } else {
      return recipientId;
    }
  });

  // If needed, resolve recipient ID to an address (e.g. if it's an ENS name).
  // If there are a lot of ENS or CNS names here this will send too many RPC requests and trigger
  // errors. The current use case of this method takes addresses, so this should not be a problem.
  // If it becomes a problem, add a batched version of toAddress.
  const provider = new StaticJsonRpcProvider(String(process.env.MAINNET_RPC_URL));
  const addresses = await Promise.all(recipientIds.map((recipientId) => toAddress(recipientId, provider)));

  // Initialize output, start by assuming all are supported.
  const isSupportedList = addresses.map((_) => true); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Now check the address against the hardcoded lists.
  const bannedAddresses = [
    '0x01e2919679362dFBC9ee1644Ba9C6da6D6245BB1',
    '0x03893a7c7463AE47D46bc7f091665f1893656003',
    '0x04DBA1194ee10112fE6C3207C0687DEf0e78baCf',
    '0x05E0b5B40B7b66098C2161A5EE11C5740A3A7C45',
    '0x07687e702b410Fa43f4cB4Af7FA097918ffD2730',
    '0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f',
    '0x08723392Ed15743cc38513C4925f5e6be5c17243',
    '0x08b2eFdcdB8822EfE5ad0Eae55517cf5DC544251',
    '0x09193888b3f38C82dEdfda55259A82C0E7De875E',
    '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    '0x0E3A09dDA6B20aFbB34aC7cD4A6881493f3E7bf7',
    '0x0Ee5067b06776A89CcC7dC8Ee369984AD7Db5e06',
    '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
    '0x1356c899D8C9467C7f71C195612F8A395aBf2f0a',
    '0x169AD27A470D064DEDE56a2D3ff727986b15D52B',
    '0x178169B423a011fff22B9e3F3abeA13414dDD0F1',
    '0x179f48c78f57a3a78f0608cc9197b8972921d1d2',
    '0x1967d8af5bd86a497fb3dd7899a020e47560daaf',
    '0x19aa5fe80d33a56d56c78e82ea5e50e5d80b4dff',
    '0x1E34A77868E19A6647b1f2F47B51ed72dEDE95DD',
    '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a',
    '0x22aaA7720ddd5388A3c0A3333430953C68f1849b',
    '0x23173fE8b96A4Ad8d2E17fB83EA5dcccdCa1Ae52',
    '0x23773E65ed146A459791799d01336DB287f25334',
    '0x242654336ca2205714071898f67E254EB49ACdCe',
    '0x2573BAc39EBe2901B4389CD468F2872cF7767FAF',
    '0x26903a5a198D571422b2b4EA08b56a37cbD68c89',
    '0x2717c5e28cf931547B621a5dddb772Ab6A35B701',
    '0x2FC93484614a34f26F7970CBB94615bA109BB4bf',
    '0x2f389ce8bd8ff92de3402ffce4691d17fc4f6535',
    '0x2f50508a8a3d323b91336fa3ea6ae50e55f32185',
    '0x308ed4b7b49797e1a98d3818bff6fe5385410370',
    '0x330bdFADE01eE9bF63C209Ee33102DD334618e0a',
    '0x35fB6f6DB4fb05e6A4cE86f2C93691425626d4b1',
    '0x39D908dac893CBCB53Cc86e0ECc369aA4DeF1A29',
    '0x3AD9dB589d201A710Ed237c829c7860Ba86510Fc',
    '0x3Cffd56B47B7b41c56258D9C7731ABaDc360E073',
    '0x3aac1cC67c2ec5Db4eA850957b967Ba153aD6279',
    '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b757d',
    '0x3e37627dEAA754090fBFbb8bd226c1CE66D255e9',
    '0x3efa30704d2b8bbac821307230376556cf8cc39e',
    '0x407CcEeaA7c95d2FE2250Bf9F2c105aA7AAFB512',
    '0x43fa21d92141BA9db43052492E0DeEE5aa5f0A93',
    '0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D',
    '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
    '0x48549a34ae37b12f6a30566245176994e17c6b4a',
    '0x4f47bc496083c727c5fbe3ce9cdf2b0f6496270c',
    '0x502371699497d08D5339c870851898D6D72521Dd',
    '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce',
    '0x538Ab61E8A9fc1b2f93b3dd9011d662d89bE6FE6',
    '0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1',
    '0x5512d943ed1f7c8a43f3435c85f7ab68b30121b0',
    '0x57b2B8c82F065de8Ef5573f9730fC1449B403C9f',
    '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
    '0x5A14E72060c11313E38738009254a90968F58f51',
    '0x5a7a51bfb49f190e5a6060a5bc6052ac14a3b59f',
    '0x5cab7692D4E94096462119ab7bF57319726Eed2A',
    '0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce',
    '0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2',
    '0x5f6c97C6AD7bdd0AE7E0Dd4ca33A4ED3fDabD4D7',
    '0x610B717796ad172B316836AC95a2ffad065CeaB4',
    '0x653477c392c16b0765603074f157314Cc4f40c32',
    '0x67d40EE1A85bf4a4Bb7Ffae16De985e8427B6b45',
    '0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7',
    '0x6acdfba02d390b97ac2b2d42a63e85293bcc160e',
    '0x6be0ae71e6c41f2f9d0d1a3b8d0f75e6f6a0b46e',
    '0x6f1ca141a28907f78ebaa64fb83a9088b02a8352',
    '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
    '0x723B78e67497E85279CB204544566F4dC5d2acA0',
    '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
    '0x743494b60097A2230018079c02fe21a7B687EAA5',
    '0x746aebc06d2ae31b71ac51429a19d54e797878e9',
    '0x756C4628E57F7e7f8a459EC2752968360Cf4D1AA',
    '0x76D85B4C0Fc497EeCc38902397aC608000A06607',
    '0x776198CCF446DFa168347089d7338879273172cF',
    '0x77777feddddffc19ff86db637967013e6c6a116c',
    '0x797d7ae72ebddcdea2a346c1834e04d1f8df102b',
    '0x7Db418b5D567A4e0E8c59Ad71BE1FcE48f3E6107',
    '0x7F19720A857F834887FC9A7bC0a0fBe7Fc7f8102',
    '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
    '0x7FF9cFad3877F21d41Da833E2F775dB0569eE3D9',
    '0x8281Aa6795aDE17C8973e1aedcA380258Bc124F9',
    '0x833481186f16Cece3f1Eeea1a694c42034c3a0dB',
    '0x83E5bC4Ffa856BB84Bb88581f5Dd62A433A25e0D',
    '0x84443CFd09A48AF6eF360C6976C5392aC5023a1F',
    '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
    '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
    '0x88fd245fEdeC4A936e700f9173454D1931B4C307',
    '0x901bb9583b24d97e995513c6778dc6888ab6870e',
    '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
    '0x931546D9e66836AbF687d2bc64B30407bAc8C568',
    '0x94A1B5CdB22c43faab4AbEb5c74999895464Ddaf',
    '0x94Be88213a387E992Dd87DE56950a9aef34b9448',
    '0x94C92F096437ab9958fC0A37F09348f30389Ae79',
    '0x97b1043abd9e6fc31681635166d430a458d14f9c',
    '0x9AD122c22B14202B4490eDAf288FDb3C7cb3ff5E',
    '0x9f4cda013e354b8fc285bf4b9a60460cee7f7ea9',
    '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
    '0xA60C772958a3eD56c1F15dD055bA37AC8e523a0D',
    '0xB20c66C4DE72433F3cE747b58B86830c459CA911',
    '0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659',
    '0xCC84179FFD19A1627E79F8648d09e095252Bc418',
    '0xCEe71753C9820f063b38FDbE4cFDAf1d3D928A80',
    '0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af',
    '0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3',
    '0xD5d6f8D9e784d0e26222ad3834500801a68D027D',
    '0xD691F27f38B395864Ea86CfC7253969B409c362d',
    '0xD692Fd2D0b2Fbd2e52CFa5B5b9424bC981C30696',
    '0xD82ed8786D7c69DC7e052F7A542AB047971E73d2',
    '0xDD4c48C0B24039969fC16D1cdF626eaB821d3384',
    '0xDF3A408c53E5078af6e8fb2A85088D46Ee09A61b',
    '0xEFE301d259F525cA1ba74A7977b80D5b060B3ccA',
    '0xF60dD140cFf0706bAE9Cd734Ac3ae76AD9eBC32A',
    '0xF67721A2D8F736E75a49FdD7FAd2e31D8676542a',
    '0xF7B31119c2682c88d88D455dBb9d5932c65Cf1bE',
    '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
    '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
    '0xa5C2254e4253490C54cef0a4347fddb8f75A4998',
    '0xa7e5d5a720f06526557c513402f2e6b5fa20b008',
    '0xaEaaC358560e11f52454D997AAFF2c5731B6f8a6',
    '0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040',
    '0xaf8d1839c3c67cf571aa74B5c12398d4901147B3',
    '0xb04E030140b30C27bcdfaafFFA98C57d80eDa7B4',
    '0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00',
    '0xb541fc07bC7619fD4062A54d96268525cBC6FfEF',
    '0xb6f5ec1a0a9cd1526536d3f0426c429529471f40',
    '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498',
    '0xc2a3829F459B3Edd87791c74cD45402BA0a20Be3',
    '0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a',
    '0xca0840578f57fe71599d29375e16783424023357',
    '0xd0975b32cea532eadddfc9c60481976e39db3472',
    '0xd47438C816c9E7f2E2888E060936a499Af9582b3',
    '0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b',
    '0xd8D7DE3349ccaA0Fde6298fe6D7b7d0d34586193',
    '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
    '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
    '0xdcbEfFBECcE100cCE9E4b153C4e15cB885643193',
    '0xdf231d99Ff8b6c6CBF4E9B9a945CBAcEF9339178',
    '0xe7aa314c77f4233c18c6cc84384a9247c0cf367b',
    '0xeDC5d01286f99A066559F60a585406f3878a033e',
    '0xed6e0a7e4ac94d976eebfb82ccf777a3c6bad921',
    '0xf4B067dD14e95Bab89Be928c07Cb22E3c94E0DAA',
    '0xffbac21a641dcfe4552920138d90f3638b3c9fba',
  ].map(getAddress);

  const additionalBlockedAddresses = [
    '0x3403c5350ea5f3Ded181aB3Ee645a2ba61FA8DB3',
    '0x364f4A48B60b3b6ff74e67779469c4aAf33F759f',
    '0x5ce083C55A1a9a47191f345e535EC23f4A94724A',
    '0xC7f981cd39E11Cc9C6546b5c16aE7D325B55134c',
    '0x364f4A48B60b3b6ff74e67779469c4aAf33F759f',
    '0x4213cb07DFF4C89E1bE81BEac1Fe0A0691f4FC63',
    '0x98a9B1C6b14e3D78235B3A0e51dABc639f059D79',
    '0x364f4A48B60b3b6ff74e67779469c4aAf33F759f',
    '0x2f76ab8517269Bf2fef0beDEFAB8A0C0007dA562',
    '0xE29028e7E90DD4B63FA37Ff82D239B1bE1a910a3',
    '0x364f4A48B60b3b6ff74e67779469c4aAf33F759f',
    '0xc8203da14165FB0E3eEB07f4bf979D9Ec8265c84',
    '0x7978d0C1EdB080970896FE76A8D9e5b4cfb8b7e7',
    '0x364f4A48B60b3b6ff74e67779469c4aAf33F759f',
    '0x3Cb93bed276bD9Abc1de303639f79043339482d3',
    '0xDBBaAF70Ef98b9acE1cf1C6aA3E724c6Bd1fea01',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x953C50782BC1836A10164FC40c08567ae8Aeb006',
    '0xf7a9929D5abCdb3b68A1fE32506d4D1F1940630D',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x94FFE01165A8682c8aF3792C0E231376E50543c7',
    '0x1dCc9919bfB8CCbc6e766c3EB02cB9d5b46Fb41b',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0xDF6F51ee7805110d1e05C9eE6A26589e4AF0C0Fd',
    '0x7c136ceA8392A2906E93678a779989Bb6235D37c',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x643858712CeBa695bD9D10530723a6203FD5AAB8',
    '0x03Dd9FD27d9bBd69c30d966A2477e51762994fF8',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x3Cb9204cE00B310E7d107AE1fa178e855053afBc',
    '0xD327f5BfeEd20e3d4Ee6c3da4656915DeF571Cab',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0xE5E8C6e17AA0F6Bb03f71292694DF5405e7f538c',
    '0x0cca7ca23E42ef8A00E86320a27a1572EfCDB845',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x5b2dFE20E048e0D743E3B288210b4c86Ba1Ca169',
    '0xb939C0399CA409a4E29150699fa19021e6Ebd9DE',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x57e7E577015468386afbAb747e4360711E30aC2D',
    '0x95E386B792077956d835C6FD1490Aba5c4A51A5b',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0xBB3Ae0a27B128B3e74021023bcA12BF3288E4DEE',
    '0x446726030A2506DE3624BEd2A34359cb083f1421',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0xD0274c0aa26f9d1AF3DFE56775B8CF2c25d20DF0',
    '0xfC2c94d415759E70f99CC88217DDc665c3052933',
    '0x35CC67Db02f7f8321Caf1E5eAA35b975b137badc',
    '0x1Fe6edE4887F85d97BE73b57b06BFa33d7bA87ee',
    '0xF00e4884315483B91dF011904F9De055D3626Ff5',
    '0x24c49e3f26b6c9b58A0c80D868874823A491b40d',
    '0x3011eFbb225D46CeAD862037258F0bffaAe9133C',
    '0xF00e4884315483B91dF011904F9De055D3626Ff5',
    '0x459e9d5305dD9a6416dD2CEA46c7aD28580150Ca',
    '0x6C87fa24A2456cf2682F9327DF02620Ca9c50249',
    '0xF00e4884315483B91dF011904F9De055D3626Ff5',
    '0x0205804cDcd66cB035c5dD5E71e798A68CDF0f6E',
    '0x9A250278313cdD32030bd681e2131FDe93B31055',
    '0xF00e4884315483B91dF011904F9De055D3626Ff5',
    '0x2d74721794A5626FbaEDdd8191d14563071dce02',
    '0xeD0c19785bAF777991820Fb1368247f9Cc326cf8',
    '0x5bB166Ff6580Ceb03972a3AfE62bE8AFa9148103',
    '0x3632d3f193E8047d2102224c60C279BC159703c2',
    '0xcad7aEfe7c83786030B2f0b5090d989edF7f54E2',
    '0x5bB166Ff6580Ceb03972a3AfE62bE8AFa9148103',
    '0x3632d3f193E8047d2102224c60C279BC159703c2',
    '0xa1ea284631D3FE00B2Da2131E9edF2556389308e',
    '0x5bB166Ff6580Ceb03972a3AfE62bE8AFa9148103',
    '0x3632d3f193E8047d2102224c60C279BC159703c2',
  ].map(getAddress);

  const invalidAddresses = new Set([...invalidStealthAddresses, ...bannedAddresses, ...additionalBlockedAddresses]);
  addresses.forEach((address, i) => {
    if (invalidAddresses.has(getAddress(address))) {
      isSupportedList[i] = false;
    }
  });

  // Next we check against the Chainalysis contract.
  // TODO Because announcements come in batches, we hit RPC limits if we try querying the contract
  // for all addresses in all announcements, even with a multicall. As a result, the above lists are
  // up to date, so we only do this check if there is a single recipient. Later, we should use a
  // subgraph or similar to get the list of sanctioned addresses to compare against.
  if (recipientIds.length === 1) {
    const abi = ['function isSanctioned(address addr) external view returns (bool)'];
    const contract = new Contract('0x40C57923924B5c5c5455c48D93317139ADDaC8fb', abi, provider);
    if (await contract.isSanctioned(addresses[0])) {
      isSupportedList[0] = false;
    }
  }

  return isSupportedList;
}
