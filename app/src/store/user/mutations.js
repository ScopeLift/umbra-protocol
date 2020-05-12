import { ethers } from 'ethers';

const { isHexString } = ethers.utils;

export function setDarkModeStatus(state, isDark) {
  state.isDark = isDark;
}

export function setWallet(state, wallet) {
  state.signer = wallet.signer;
  state.provider = wallet.provider;
  state.ethersProvider = wallet.ethersProvider;
  state.userAddress = wallet.userAddress;
  state.userEnsDomain = wallet.userEnsDomain;
}

export function setPrivateKey(state, key) {
  const isHex = isHexString(key);
  const startsWith0x = key.slice(0, 2) === '0x';
  const isCorrectLength = key.length === 66;
  const isValid = isHex && startsWith0x && isCorrectLength;
  if (isValid) state.privateKey = key;
  else state.privateKey = undefined;
}
