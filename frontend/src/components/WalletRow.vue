<template>
  <div v-if="display" class="walletRow-container q-menu" :class="isDark ? 'q-dark' : ''">
    <div class="row justify-between items-center q-mb-sm">
      <div>{{ $t('WalletRow.account') }}</div>
      <div @click="setDisplayWalletRow(false)">
        <q-icon class="copy-icon q-pr-xs cursor-pointer" name="fas fa-times" />
      </div>
    </div>
    <div class="column inner-container">
      <div class="row justify-between items-center">
        <div class="text-xxs">{{ $t('WalletRow.connected-with') }} {{ connectedWalletLabel }}</div>
        <base-button
          @click="disconnectWallet()"
          :label="$t('WalletRow.disconnect')"
          :outline="true"
          :rounded="true"
          size="10px"
          padding="3px"
        />
      </div>
      <div class="row">
        <div class="row text-caption text-break-word">
          <span id="wallet-row-avatar-container" class="row q-mr-sm">
            <div class="flex" id="wallet-row-jazzicon" />
          </span>
          <span v-if="userDisplayName" class="text-caption text-bold">
            {{ userDisplayName }}
          </span>
        </div>
        <div class="row text-caption items-center cursor-pointer">
          <div @click="copyAddress(userAddress)" class="text-xxs copy-icon-parent cursor-pointer">
            <q-icon class="copy-icon q-pr-xs" name="far fa-copy" />
            <span class="text-xxs">{{ $t('WalletRow.copy-address') }}</span>
          </div>

          <div class="row items-center q-ml-sm text-xxs external-link-parent cursor-pointer">
            <a class="hyperlink" :href="blockExplorerUrl" target="_blank" rel="noopener noreferrer">
              <q-icon class="external-link q-pr-xs dark-toggle" name="fas fa-external-link-alt" />
              <span>{{ $t('WalletRow.view-on-explorer') }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onUpdated, computed, PropType } from 'vue';
import { copyToClipboard } from 'quasar';
import { tc } from 'src/boot/i18n';
import BaseButton from 'src/components/BaseButton.vue';
import { toAddress } from 'src/utils/address';
import { notifyUser } from 'src/utils/alerts';
import useWalletStore from 'src/store/wallet';
import jazzicon from '@metamask/jazzicon';
import useSettingsStore from 'src/store/settings';

function useWalletRow(userAddress: string) {
  const { provider, currentChain, connectedWalletLabel, disconnectWallet } = useWalletStore();

  /**
   * @notice Copies the address of type to the clipboard
   */
  async function copyAddress(address: string) {
    if (!provider.value) return;
    const mainAddress = await toAddress(address, provider.value);
    await copyToClipboard(mainAddress);
    notifyUser('success', `${tc('WalletRow.address-copied')}`);
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
      type: Function as PropType<(display: boolean) => void>,
      required: true,
    },
    advancedMode: {
      type: Boolean,
      required: true,
    },
    avatar: {
      type: null as unknown as PropType<string | null>,
      required: true,
    },
  },

  setup(props, context) {
    const { isDark } = useSettingsStore();
    const onClickOutside = (e: Event) => {
      const addressSettings = document.querySelector('#address-settings');
      const walletRow = document.querySelector('.walletRow-container');
      const path = e.composedPath();

      if (addressSettings && walletRow && !path.includes(addressSettings) && !path.includes(walletRow)) {
        props.setDisplayWalletRow(false);
      }
    };

    onUpdated(() => {
      if (props.display) {
        const width = 20;
        let img;
        let node;
        if (props.avatar) {
          // load the avatar image async and display the jazzicon while waiting
          const avatarImg = new Image();
          document.querySelector('#wallet-row-jazzicon')?.remove();
          node = document.querySelector('#wallet-row-avatar-container');
          avatarImg.id = 'avatar';
          avatarImg.width = 20;
          avatarImg.src = props.avatar;
          img = avatarImg;
        } else {
          const identicon = jazzicon(width, parseInt(props.userAddress.slice(2, 10), 16));
          node = document.querySelector('#wallet-row-jazzicon');
          img = identicon;
        }
        if (node && !node?.firstChild) {
          node.appendChild(img);
        }
        window.addEventListener('click', onClickOutside);
      } else {
        window.removeEventListener('click', onClickOutside);
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
.walletRow-container
  margin-top: 40px
  position: absolute !important
  width: 290px
  height: 150px
  z-index: 1
  border-radius: 15px
  padding: 15px

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
