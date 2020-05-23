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
  state.networkName = wallet.networkName;
}

export function setPrivateKey(state, key) {
  const isHex = isHexString(key);
  const startsWith0x = key.slice(0, 2) === '0x';
  const isCorrectLength = key.length === 66;
  const isValid = isHex && startsWith0x && isCorrectLength;
  if (isValid) state.sensitive.privateKey = key;
  else state.sensitive.privateKey = undefined;
}

export function setPassword(state, password) {
  state.sensitive.password = password;
}

export function setFileDownloadStatus(state, wasPrivateKeyDownloaded) {
  state.sensitive.wasPrivateKeyDownloaded = wasPrivateKeyDownloaded;
}

export function setEnsStatus(state, isEnsConfigured) {
  state.isEnsConfigured = isEnsConfigured;
}

export function setRecipientPublicKey(state, key) {
  state.send.recipientPublicKey = key;
}

export function withdrawalData(state, data) {
  state.withdrawalData = [];
  state.withdrawalData = data;
}
