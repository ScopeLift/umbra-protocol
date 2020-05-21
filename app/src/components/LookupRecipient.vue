<template>
  <div>
    Enter the identifier provided by the recipient.
    This can be an ENS domain, transaction hash, address, or public key.

    <q-form ref="lookupRecipientForm">
      <base-input
        v-model="identifier"
        label="Recipient Identifier"
        :rules="isValidIdentifier"
        :disabled="!provider"
      />
    </q-form>
    <div
      v-if="identifierType"
      class="row justify-start items-center q-mb-md"
      style="margin-top: -1rem"
    >
      <q-icon
        left
        color="positive"
        name="fas fa-check"
      />
      <span class="text-caption">
        Recipient identified with
        <span v-if="identifierType === 'publicKey'">public key</span>
        <span v-else-if="identifierType === 'txHash'">transaction hash</span>
        <span v-else-if="identifierType === 'address'">address</span>
        <span v-else-if="identifierType === 'ens'">ENS domain</span>
      </span>
    </div>
    <div
      v-if="!provider"
      class="text-caption text-bold"
    >
      Please login to get started
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import helpers from 'src/mixins/helpers';

const ethers = require('ethers');
const umbra = require('umbra-js');

const { isHexString } = ethers.utils;
const { ens, utils } = umbra;

export default {
  name: 'LookupRecipient',

  mixins: [helpers],

  data() {
    return {
      identifier: undefined,
      identifierType: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
    }),
  },

  methods: {
    isValidIdentifier() {
      return new Promise((resolve) => {
        this.getIdentifierType().then((result) => {
          resolve(!!result || 'Please enter a valid identifier');
        });
      });
    },

    /**
     * @notice Updates the recipient public key value stored in the state, since this
     * component is only used when sending funds
     */
    updateRecipientPublicKey(key) {
      this.$store.commit('user/setRecipientPublicKey', key);
    },

    /**
     * @notice Resets identifier and identifierType to their defaults. This is called by
     * the Send page after sending a transaction
     */
    resetIdentifier() {
      this.identifier = undefined;
      this.identifierType = undefined;
      this.updateRecipientPublicKey(undefined);
      this.$refs.lookupRecipientForm.resetValidation();
    },

    async getIdentifierType() {
      const val = this.identifier;
      if (!val || !this.provider) {
        this.identifierType = undefined;
        return this.identifierType;
      }

      // Check if this is a valid public key
      const isValidPublicKey = val.length === 132 && isHexString(val) && val.slice(0, 4) === '0x04';
      if (isValidPublicKey) {
        this.identifierType = 'publicKey';
        this.updateRecipientPublicKey(val);
        return this.identifierType;
      }

      // Check if this is a valid transaction hash
      const isValidTxHash = val.length === 66 && isHexString(val) && val.slice(0, 2) === '0x';
      if (isValidTxHash) {
        // If tx hash is valid, ensure a public key can be recovered from it
        const publicKey = await utils.recoverPublicKeyFromTransaction(val, this.provider);
        if (publicKey) {
          this.updateRecipientPublicKey(publicKey);
          this.identifierType = 'txHash';
          return this.identifierType;
        }
      }

      // Check if this is a valid address
      const isValidAddress = val.length === 42 && isHexString(val) && val.slice(0, 2) === '0x';
      if (isValidAddress) {
        // Get last transaction hash sent by that address
        const txHash = await this.getSentTransaction(val);
        if (txHash) {
          // Get public key from that transaction
          const publicKey = await utils.recoverPublicKeyFromTransaction(txHash, this.provider);
          if (publicKey) {
            this.updateRecipientPublicKey(publicKey);
            this.identifierType = 'address';
            return this.identifierType;
          }
        }
      }

      // Check if this is a valid ENS domain
      const publicKey = await ens.getPublicKey(val, this.provider);
      if (publicKey) {
        this.updateRecipientPublicKey(publicKey);
        this.identifierType = 'ens';
        return this.identifierType;
      }

      this.updateRecipientPublicKey(undefined);
      this.identifierType = undefined;
      return this.identifierType;
    },
  },
};
</script>
