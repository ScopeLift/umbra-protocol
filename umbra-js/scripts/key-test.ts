/**
 * @notice Demonstrates that publishing a private key pke computed from private key pka and known
 * scale factor e, i.e. pke = pka * e, is not secure and pka can be trivially recovered by anyone
 * @dev To run this file, clone this repo and run:
 *   $ yarn
 *   $ cd umbra-js
 *   $ yarn ts-node scripts/key-test.ts
 */

import { ethers } from 'ethers';
import { ec as EC } from 'elliptic';
import { KeyPair } from '../src/classes/KeyPair';
import * as BN from 'bn.js';

const BigNumber = ethers.BigNumber;
const ec = new EC('secp256k1');
const p = BigNumber.from(`0x${(ec.n as BN).toString('hex')}`); // order of secp256k1

/**
 * @notice Calculates the multiplicative inverse of a and b using extended Euclidean algorithm
 * @dev Worse case runs in O(log b). Algorithm source: https://andrea.corbellini.name/2015/05/23/elliptic-curve-cryptography-finite-fields-and-discrete-logarithms/
 * @returns Object {gcd, x, y} where a * x + b * y = gcd
 */
function extendedEuclideanAlgorithm(a: ethers.BigNumber, b: ethers.BigNumber) {
  let [s, oldS] = [BigNumber.from(0), BigNumber.from(1)];
  let [t, oldT] = [BigNumber.from(1), BigNumber.from(0)];
  let [r, oldR] = [BigNumber.from(b), BigNumber.from(a)];

  while (!r.eq(ethers.constants.Zero)) {
    const quotient = oldR.div(r);
    [oldR, r] = [r, oldR.sub(quotient.mul(r))];
    [oldS, s] = [s, oldS.sub(quotient.mul(s))];
    [oldT, t] = [t, oldT.sub(quotient.mul(t))];
  }

  return { gcd: oldR, x: oldS, y: oldT };
}

/**
 * @notice Compute multiplicative inverse of number n for curve with order p
 * @dev Algorithm source: https://andrea.corbellini.name/2015/05/23/elliptic-curve-cryptography-finite-fields-and-discrete-logarithms/
 * @returns Multiplicative inverse of n mod p, i.e. returns an integer m such that (n * m) % p = 1
 */
function multiplicativeInverseOf(n: ethers.BigNumber, p: ethers.BigNumber) {
  //
  const { gcd, x, y } = extendedEuclideanAlgorithm(n, p);
  if (!gcd.eq(ethers.constants.One)) throw new Error('n has no multiplicative inverse modulo p');
  if (!n.mul(x).add(p.mul(y)).mod(p).eq(gcd)) throw new Error('Uh oh!');
  return x.mod(p);
}

(function () {
  // Alice starts with some private key, which is a secret
  const initialPrivateKey = BigNumber.from(ethers.Wallet.createRandom().privateKey);
  const initialKeyPair = new KeyPair(initialPrivateKey.toHexString());

  // Define arbitrary constant that we multiply by to get the generation and encryption key pairs.
  // Everyone would know this value
  const encryptionKeyFactor = BigNumber.from(
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  );

  // Alice associates her public key, given by initialKeyPair.publicKeyHex, with her ENS name

  // Alice computes her encryption private key from her initial private key by multiplying by
  // the constant
  const encryptionKeyPair = initialKeyPair.mulPrivateKey(encryptionKeyFactor.toHexString());

  // Now, can she share the encryption private key with a third party without them knowing the
  // generation key pair? For example, a scanning service with our encryption private key should be
  // able to use this to detect our funds, but we don't want them to have the generation key
  // needed for accessing funds

  // As the scanning service, I have the encryption private key which was computed as
  //   encryptionPrivateKey = initialPrivateKey * encryptionKeyFactor;
  //
  // This means we can find the initial private key by computing
  //   initialPrivateKey = encryptionPrivateKey * encryptionKeyFactor^(-1)
  //
  // Where encryptionKeyFactor^(-1) is the multiplicative inverse of encryptionKeyFactor

  // Private keys are simply numbers, not curve points, so this is not the discrete log problem.
  // Instead, the multiplicative inverse can be trivially computed using the extended Euclidean
  // algorithm. So let's do that
  const encryptionPrivateKey = encryptionKeyPair.privateKeyBN as ethers.BigNumber;
  const encryptionFactorInverse = multiplicativeInverseOf(encryptionKeyFactor, p);
  const computedInitialPrivateKey = encryptionFactorInverse.mul(encryptionPrivateKey).mod(p);

  // And as the scanning service, we have successfully recovered the initial private key and
  // therefore can compute Alice's generation private key to access her funds
  console.log('\nInitial private key:    ', initialPrivateKey.toHexString());
  console.log('Computed private key:   ', computedInitialPrivateKey.toHexString(), '\n');

  if (initialPrivateKey.eq(computedInitialPrivateKey)) {
    console.log('Danger! This is not safe 👎️\n');
  } else {
    // If this executes, something above is incorrect
    console.log('Not computed correctly! 👍️\n');
  }
})();
