<template>
  <div>
    <base-input
      v-model="privateKey"
      label="Your Private Key"
      :lazy-rules="false"
      :rules="isValidPrivateKey"
    />
  </div>
</template>

<script>
import { ethers } from 'ethers';

const { isHexString } = ethers.utils;

export default {
  name: 'InputPrivateKey',

  data() {
    return {
      privateKey: undefined,
    };
  },

  methods: {
    isValidPrivateKey() {
      this.$store.commit('user/setPrivateKey', this.privateKey);
      if (!this.privateKey) return undefined;
      const isHex = isHexString(this.privateKey);
      const startsWith0x = this.privateKey.slice(0, 2) === '0x';
      const isCorrectLength = this.privateKey.length === 66;
      const isValid = isHex && startsWith0x && isCorrectLength;
      return isValid || "Private key must be a 66 character hex string that begins with '0x'";
    },
  },
};
</script>
