export function setDarkModeStatus(state, isDark) {
  state.isDark = isDark;
}

export function setWallet(state, wallet) {
  state.signer = wallet.signer;
  state.provider = wallet.provider;
  state.ethersProvider = wallet.ethersProvider;
  state.userAddress = wallet.userAddress;
}
