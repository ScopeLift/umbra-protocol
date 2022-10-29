<template>
  <div v-if="display" class="container q-menu" :class="isDark ? 'q-dark' : ''">
    <div class="row justify-between items-center q-mb-sm">
      <div>Account</div>
      <div @click="setDisplayWalletRow(false)">
        <q-icon class="copy-icon q-pr-xs" name="fas fa-times" />
      </div>
    </div>
    <div class="column inner-container">
      <div class="row justify-between items-center">
        <div class="text-xxs">Connected with {{ connectedWalletLabel }}</div>
        <base-button
          @click="disconnectWallet()"
          label="Disconnect"
          :outline="true"
          :rounded="true"
          size="10px"
          padding="3px"
        />
      </div>
      <div class="row">
        <div class="row text-caption text-break-word cursor-pointer copy-icon-parent">
          <div class="flex q-mr-sm" id="wallet-row-jazzicon" />
          <span v-if="userDisplayName" class="copy text-caption text-bold">
            {{ userDisplayName }}
          </span>
        </div>
        <div class="row text-caption items-center">
          <div @click="copyAddress(userAddress)" class="text-xxs copy-icon-parent cursor-pointer">
            <q-icon class="copy-icon q-pr-xs" name="far fa-copy" />
            <span class="text-xxs">Copy Address</span>
          </div>

          <div class="row items-center q-ml-sm text-xxs external-link-parent cursor-pointer">
            <a class="hyperlink" :href="blockExplorerUrl" target="_blank" rel="noopener noreferrer">
              <q-icon class="external-link q-pr-xs dark-toggle" name="fas fa-external-link-alt" />
              <span>View on Explorer</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Add WalletRow
import { defineComponent, onUpdated, computed } from '@vue/composition-api';
import { copyToClipboard } from 'quasar';
import BaseButton from 'src/components/BaseButton.vue';
import { toAddress } from 'src/utils/address';
import useWalletStore from 'src/store/wallet';
import jazzicon from '@metamask/jazzicon';
import useSettingsStore from 'src/store/settings';

function useWalletRow(userAddress: string) {
  const { provider, currentChain, connectedWalletLabel, disconnectWallet } = useWalletStore();
  console.log(currentChain);
  console.log(disconnectWallet);
  console.log(connectedWalletLabel);
  /**
   * @notice Copies the address of type to the clipboard
   */
  async function copyAddress(address: string) {
    if (!provider.value) return;
    const mainAddress = await toAddress(address, provider.value);
    console.log(address);
    console.log('Click');
    await copyToClipboard(mainAddress);
    /* notifyUser('success', `${type} ${vm.$i18n.tc('AccountReceiveTable.address-copied')}`); */
  }
  return {
    copyAddress,
    blockExplorerUrl: computed(() => `${currentChain.value?.blockExplorerUrls![0] || ''}/address/${userAddress}`),
    connectedWalletLabel: connectedWalletLabel.value,
    disconnectWallet,
  };
}

export default defineComponent({
  name: 'WalletRow',
  components: { BaseButton },
  props: {
    userDisplayName: {
      type: String,
      required: true,
    },
    userAddress: {
      type: String,
      required: true,
    },
    display: {
      type: Boolean,
      required: true,
    },
    setDisplayWalletRow: {
      type: Function,
      required: true,
    },
  },

  setup(props, context) {
    const { isDark } = useSettingsStore();
    console.log('IsDark');
    console.log(isDark);

    onUpdated(() => {
      if (props.display) {
        const width = 20;
        const identicon = jazzicon(width, parseInt(props.userAddress.slice(2, 10), 16));
        const node = document.querySelector('#wallet-row-jazzicon');
        if (node && !node?.firstChild) {
          node.appendChild(identicon);
        }
      }
    });

    return {
      context,
      ...useWalletRow(props.userAddress),
      isDark,
    };
  },
});
</script>

<style lang="sass" scoped>
.container
  margin-top: 40px
  position: absolute !important
  width: 290px
  height: 150px
  z-index: 1
  border-radius: 15px
  padding: 15px
  box-shadow: 0 1px 5px rgb(0 0 0 / 20%), 0 2px 2px rgb(0 0 0 / 14%), 0 3px 1px -2px rgb(0 0 0 / 12%)

  @media screen and (max-width: $breakpoint-xs-max)
    left: -40px

.inner-container
  padding: 8px
  border: .4px solid grey
  border-radius: 15px

.copy-icon-parent:hover
  color: $primary

.external-link-parent:hover
  color: $primary
.text-xxs
  font-size: 10px
</style>
