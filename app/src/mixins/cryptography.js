/**
 * @notice This mixin contains cryptographic functions
 */
const passworder = require('browser-passworder');


export default {
  data() {
    return {};
  },

  methods: {
    async encryptPrivateKey(password, dataToEncrypt) {
      const encrypted = await passworder.encrypt(password, dataToEncrypt);
      return encrypted;
    },

    async decryptPrivateKey(password, dataToDecrypt) {
      const decrypted = await passworder.decrypt(password, dataToDecrypt);
      return decrypted;
    },
  },
};
