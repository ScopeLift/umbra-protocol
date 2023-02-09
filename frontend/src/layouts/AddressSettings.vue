<template>
  <div id="address-settings" class="column relative-position">
    <div class="row no-wrap" @click="displayWalletRow = !displayWalletRow">
      <connect-wallet>
        <div class="row text-caption dark-toggle cursor-pointer">
          <Avatar v-if="userAddress" :address="userAddress" :avatar="avatar" class="q-mr-sm" />
          <span v-if="userDisplayName">
            {{ userDisplayName }}
          </span>
        </div>
      </connect-wallet>
      <span v-if="advancedMode" class="q-ml-sm">
        <base-tooltip label="🧙" size="sm">{{ $t('Address-Settings.advanced-mode-on') }}</base-tooltip>
      </span>
    </div>
    <WalletRow
      :userDisplayName="userDisplayName"
      :userAddress="userAddress"
      :display="displayWalletRow"
      :setDisplayWalletRow="setDisplayWalletRow"
      :advancedMode="advancedMode"
      :avatar="avatar"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import Avatar from 'src/components/Avatar.vue';
import WalletRow from 'src/components/WalletRow.vue';

export default defineComponent({
  name: 'AddressSettings',
  components: { BaseTooltip, ConnectWallet, Avatar, WalletRow },
  props: {
    avatar: {
      type: null as unknown as PropType<string | null>,
      required: true,
    },
    userDisplayName: {
      type: String,
      required: true,
    },
    userAddress: {
      type: String,
      required: false,
    },
    advancedMode: {
      type: Boolean,
      required: true,
    },
  },

  setup(_props, context) {
    const displayWalletRow = ref(false);
    const setDisplayWalletRow = (value: boolean) => {
      displayWalletRow.value = value;
    };

    return {
      context,
      displayWalletRow,
      setDisplayWalletRow,
    };
  },
});
</script>
