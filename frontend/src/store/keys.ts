import { computed, ref } from '@vue/composition-api';
import { ethers } from 'ethers';
import { KeyPair } from '@umbra/umbra-js';
import { Signer } from 'components/models';
type KeyPairType = typeof KeyPair;

// ============================================= State =============================================
// We have two distinct key pairs generated from the same signature:
//   KeyPair A: keyPairStealthAddress
//     Public Key A   used by sender for computing the receiver's stealth address
//     Private Key A  used by receiver to compute their receiving stealth address
//   KeyPair B: keyPairEncryption
//     Public Key B   used by sender for encrypting the announcement
//     Private Key B  used by receiver for decrypting announcements

const keyPairStealthAddress = ref<KeyPairType>();
const keyPairEncryption = ref<KeyPairType>();

// ======================================= Helper Functions ========================================
/**
 * @notice Get the users signature
 * @param signer ethers.js Signer instance
 * @param message message to sign
 * @returns hex string of the user's signature
 */
async function getSignature(signer: Signer, message: string) {
  // Get user's address and provider from the signer instance
  const userAddress = await signer.getAddress();
  const provider = signer.provider;

  // Request user's signature
  let signature;
  signature = await signer.signMessage(message); // prompt to user is here, uses eth_sign

  // Fallback to personal_sign if eth_sign isn't supported (for Status and other wallets)
  if (!signature) {
    signature = String(
      await provider.send('personal_sign', [
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)),
        userAddress.toLowerCase(),
      ])
    );
  }
  return signature;
}

// ========================================== Main Store ===========================================
export default function useWalletStore() {
  // ------------------------------------------- Actions -------------------------------------------
  /**
   * @notice Request user's signature to generate the two private keys
   * @param signer ethers.js Signer instance
   * @returns Object containing thw two key pairs
   */
  async function getPrivateKeys(signer: Signer) {
    // Define the message to sign and get signature
    const message =
      'Sign this message to access your Umbra account.\n\nThis signature gives the app access to your funds, so only sign this message for a trusted client!';
    const signature = await getSignature(signer, message);

    // Split hex string signature into 32 byte pieces
    const startIndex = 2; // first two characters are 0x, so skip thise
    const length = 64; // 32 hex bytes is 64 characters
    const portion1 = signature.slice(startIndex, startIndex + length);
    const portion2 = signature.slice(startIndex + length, startIndex + length + length);

    if (`0x${portion1}${portion2}${signature.slice(signature.length - 2)}` !== signature) {
      throw new Error('Signature not generated correctly');
    }

    // Hash the signature pieces to get the two private keys
    const privateKeyStealthAddress = ethers.utils.sha256(`0x${portion1}`);
    const privateKeyEncryption = ethers.utils.sha256(`0x${portion2}`);

    // Create KeyPair instances from the private keys and return them
    keyPairStealthAddress.value = new KeyPair(privateKeyStealthAddress);
    keyPairEncryption.value = new KeyPair(privateKeyEncryption);
    return { keyPairStealthAddress, keyPairEncryption };
  }

  // ------------------------------------------ Mutations ------------------------------------------
  function setKeyPairStealthAddress(key: string) {
    keyPairStealthAddress.value = new KeyPair(key);
  }
  function setKeyPairEncryption(key: string) {
    keyPairEncryption.value = new KeyPair(key);
  }

  // ------------------------------------- Exposed parameters --------------------------------------
  return {
    keyPairStealthAddress: computed(() => keyPairStealthAddress.value),
    keyPairEncryption: computed(() => keyPairEncryption.value),
    getPrivateKeys,
    setKeyPairStealthAddress,
    setKeyPairEncryption,
  };
}
