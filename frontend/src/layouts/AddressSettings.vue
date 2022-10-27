<template>
  <div class="column relative-position">
    <div class="row no-wrap">
      <span v-if="advancedMode" class="q-mr-sm">
        <base-tooltip label="🧙" size="sm">{{ $t('Address-Settings.advanced-mode-on') }}</base-tooltip>
      </span>
      <connect-wallet>
        <div class="row text-caption dark-toggle">
          <span v-if="userDisplayName">
            {{ userDisplayName }}
          </span>
          <Avatar v-if="userAddress" :address="userAddress" :avatar="avatar" class="q-ml-sm" />
        </div>
      </connect-wallet>
    </div>
    <WalletRow :userDisplayName="userDisplayName" :userAddress="userAddress" />
  </div>
</template>

<script lang="ts">
// Add WalletRow
import { defineComponent, PropType } from '@vue/composition-api';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import Avatar from 'src/components/Avatar.vue';
import WalletRow from 'src/components/WalletRow.vue';

export default defineComponent({
  name: 'AddressSettings',
  components: { BaseTooltip, ConnectWallet, Avatar, WalletRow },
  props: {
    avatar: {
      type: (null as unknown) as PropType<string | null>,
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
});
</script>
