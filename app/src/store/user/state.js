export default function () {
  return {
    // User settings
    isDark: undefined,
    // Wallet
    signer: undefined,
    provider: undefined,
    ethersProvider: undefined,
    udResolution: undefined,
    domainService: undefined,
    userAddress: undefined,
    userEnsDomain: undefined,
    isEnsConfigured: undefined,
    networkName: undefined,
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
    withdrawalData: [],
  };
}
