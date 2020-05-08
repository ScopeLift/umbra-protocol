<template>
  <div>
    Enter the identifier provided by the recipient.
    This can be an ENS domain, transaction hash, address, or public key.
    <base-input
      v-model="identifier"
      label="Recipient Identifier"
      :rules="isValidIdentifierMethod"
    />
    <div v-if="isValidIdentifier">
      <q-icon
        color="positive"
        name="fas fa-check"
        style="margin-top: -2rem"
      />
    </div>

    <div class="negative text-bold">
      This page is a work in progress, and right now only public keys are supported
    </div>
  </div>
</template>

<script>
const ethers = require('ethers');
// const umbra = require('umbra-protocol');

const { utils } = ethers;
// const { KeyPair } = umbra;

export default {
  name: 'LookupRecipient',
  data() {
    return {
      identifier: undefined,
    };
  },

  computed: {
    isValidIdentifier() {
      const val = this.identifier;
      if (!val) return false;
      const isValidPublicKey = val.length === 132 && utils.isHexString(val) && val.slice(0, 4) === '0x04';
      const isValid = isValidPublicKey;
      return isValid;
    },
  },

  methods: {
    isValidIdentifierMethod() {
      return this.isValidIdentifier ? true : 'Please enter a valid identifier';
    },
  },
};
</script>
