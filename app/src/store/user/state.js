export default function () {
  return {
    // User settings
    isDark: undefined,
    // Wallet
    signer: undefined,
    provider: undefined,
    ethersProvider: undefined,
    userAddress: undefined,
    userEnsDomain: undefined,
    isEnsConfigured: undefined,
    // Sensitive info
    sensitive: {
      password: undefined,
      privateKey: undefined,
      wasPrivateKeyDownloaded: undefined,
    },
    // For sending funds
    send: {
      recipientPublicKey: undefined,
    },
  };
}
