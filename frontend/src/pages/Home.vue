<template>
  <q-page padding class="all-content-format">
    <div class="text-center q-mb-xl">
      <h2 v-if="!$q.screen.xs" class="header-black">{{ $t('Home.header') }}</h2>
      <h3 v-else class="header-black">{{ $t('Home.header') }}</h3>
      <h4 class="darkgrey q-mt-md">{{ $t('Home.description') }}</h4>
    </div>

    <div class="row justify-center q-col-gutter-sm q-pt-xl">
      <home-action-card
        class="col-xs-12 col-4"
        to="send"
        :text="$t('Home-action-card.send')"
        :description="$t('Home-action-card.send-description')"
      />
      <home-action-card
        class="col-xs-12 col-4"
        to="receive"
        :text="$t('Home-action-card.receive')"
        :description="$t('Home-action-card.receive-description')"
      />
      <home-action-card
        v-if="!isAccountSetup"
        class="col-xs-12 col-4"
        to="setup"
        :text="$t('Home-action-card.setup')"
        :description="$t('Home-action-card.setup-description')"
      />
    </div>

    <div class="q-mt-xl row justify-center">
      <div class="tutorial col-auto">
        <h3 class="header-black text-center q-mt-none">{{ $t('Home.Tutorial.tutorial') }}</h3>
        <div class="text-left">
          <!-- To Receive Funds -->
          <h5 class="text-center q-mt-xl">{{ $t('Home.Tutorial.receiving-funds') }}</h5>
          <ol>
            <li v-html="$t('Home.Tutorial.receive-first')"></li>
            <li>{{ $t('Home.Tutorial.receive-second') }}</li>
            <li v-html="$t('Home.Tutorial.receive-third')"></li>
          </ol>
          <!-- To Send Funds -->
          <h5 class="text-center q-mt-xl">{{ $t('Home.Tutorial.sending-funds') }}</h5>
          <ol>
            <li>{{ $t('Home.Tutorial.send-first') }}</li>
            <li v-html="$t('Home.Tutorial.send-second')"></li>
          </ol>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import HomeActionCard from 'components/HomeActionCard.vue';
import useWalletStore from 'src/store/wallet';

export default defineComponent({
  name: 'PageHome',
  components: { HomeActionCard },
  setup() {
    window.logger.debug('test log level debug');
    window.logger.warn('test log level warn');
    window.logger.info('test log level info');
    const { isAccountSetup } = useWalletStore();
    return { isAccountSetup };
  },
});
</script>

<style lang="sass" scoped>
.tutorial
  border: 1px solid $primary
  border-radius: 15px
  padding: 2rem
</style>
