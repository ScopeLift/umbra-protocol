<template>
  <q-page padding>
    <h2 class="page-title">Setup</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <connect-wallet-card text="Connect your wallet to setup your account" />
    </div>

    <!-- Walk through of process -->
    <q-carousel
      v-else
      v-model="carouselStep"
      animated
      class="shadow-2 rounded-borders q-mx-auto"
      :control-color="carouselStep !== '4' ? 'grey' : undefined"
      height="300px"
      navigation
      navigation-icon="fas fa-circle"
      ref="carousel"
      style="max-width: 800px"
      swipeable
      transition-next="slide-left"
      transition-prev="slide-right"
    >
      <!-- Carousel Navigation Buttons, hidden on step 4 (the success step) -->
      <template v-slot:control v-if="carouselStep !== '4'">
        <q-carousel-control v-if="carouselStep !== '1'" position="left" class="row">
          <q-btn @click="$refs.carousel.previous()" class="q-my-auto" flat icon="fas fa-arrow-left" text-color="grey" />
        </q-carousel-control>
        <q-carousel-control v-if="carouselStep !== '3'" position="right" class="row">
          <q-btn
            @click="$refs.carousel.next()"
            class="q-my-auto"
            flat
            icon="fas fa-arrow-right"
            ref="carouselBtnRight"
            text-color="grey"
          />
        </q-carousel-control>
      </template>

      <!-- Step 1: ENS Registration -->
      <q-carousel-slide name="1" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">Step 1: ENS Registration</h5>
          <div class="q-mt-md">
            <!-- User has ENS name -->
            <div v-if="userEns">
              You are logged in with <span class="text-bold">{{ userAddress }}</span
              >. Please continue to the next step.
            </div>
            <!-- User does not have ENS name -->
            <div v-else>
              <p>
                An ENS domain was not found for this address. If you do have an address, make sure the reverse record is
                set.
              </p>
              <p>
                Either login with a different address and refresh the page, or use the
                <a href="https://app.ens.domains/" class="hyperlink">ENS website</a> to purchase and configure your
                domain so it resolves to your Ethereum address. Be sure to use the Public Resolver and set the reverse
                record.
              </p>
            </div>
          </div>
        </div>
      </q-carousel-slide>

      <!-- Step 2: Get Signature -->
      <q-carousel-slide name="2" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">Step 2: Generate Keys</h5>
          <div class="q-mt-md">
            <p>
              Use the button below to sign a message, which will be used to generate an Umbra-specific pair of private
              keys. These keys allow you to securely use Umbra without compromising the private keys of your connected
              wallet.
            </p>
            <p>You do not need to save these keys anywhere!</p>
          </div>
          <base-button @click="getPrivateKeysHandler" :disable="isWaitingForUser" label="Sign" />
        </div>
      </q-carousel-slide>

      <!-- Step 3: Save private keys to ENS -->
      <q-carousel-slide name="3" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">Step 3: Publish Keys</h5>
          <p class="q-mt-md">
            You'll now be asked to send a transaction which associates the two public keys generated with
            {{ userAddress.value }}. This means people can now securely send you funds through Umbra by visiting this
            site and sending funds to {{ userAddress.value }}.
          </p>
          <base-button @click="publishKeys" :disable="isWaitingForUser" label="Publish keys" />
        </div>
      </q-carousel-slide>

      <!-- Step 4: Success -->
      <q-carousel-slide name="4" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">
            <q-icon color="positive" class="q-mr-sm" name="fas fa-check" />Setup Complete!
          </h5>
          <p class="q-mt-md">
            You may now return
            <router-link class="hyperlink" :to="{ name: 'home' }">home</router-link> to send or receive funds.
          </p>
        </div>
      </q-carousel-slide>
    </q-carousel>
  </q-page>
</template>

<script lang="ts">
import { QBtn } from 'quasar';
import { defineComponent, ref } from '@vue/composition-api';
import { TransactionResponse } from '@ethersproject/providers';
import BaseButton from 'src/components/BaseButton.vue';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';

function useKeys() {
  const { domainService, getPrivateKeys, userAddress, userEns, spendingKeyPair, viewingKeyPair } = useWalletStore();
  const { notifyUser, txNotify } = useAlerts();
  const carouselBtnRight = ref<QBtn>();
  const keyStatus = ref<'waiting' | 'success' | 'denied'>('waiting');
  const carouselStep = ref('1');
  const isWaitingForUser = ref(false);

  async function getPrivateKeysHandler() {
    if (keyStatus.value === 'success') {
      notifyUser('info', 'You have already signed. Please continue to the next step');
      return;
    }
    try {
      isWaitingForUser.value = true;
      keyStatus.value = await getPrivateKeys();
      carouselBtnRight.value?.click();
    } finally {
      isWaitingForUser.value = false;
    }
  }

  async function publishKeys() {
    if (!domainService.value) throw new Error('Invalid DomainService. Please refresh the page');
    if (!userEns.value) {
      throw new Error('ENS or CNS name not found. Please return to the first step');
    }
    const hasKeys = spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex;
    if (!hasKeys) throw new Error('Missing keys. Please return to the previous step');
    try {
      isWaitingForUser.value = true;
      const tx = (await domainService.value.setPublicKeys(
        userEns.value,
        String(spendingKeyPair.value?.publicKeyHex),
        String(viewingKeyPair.value?.publicKeyHex)
      )) as TransactionResponse;
      txNotify(tx.hash);

      await tx.wait();
      carouselStep.value = '4';
    } finally {
      isWaitingForUser.value = false;
    }
  }

  return {
    carouselBtnRight,
    carouselStep,
    userAddress,
    userEns,
    keyStatus,
    getPrivateKeysHandler,
    publishKeys,
    isWaitingForUser,
  };
}

export default defineComponent({
  components: { BaseButton, ConnectWalletCard },
  name: 'PageSetup',
  setup() {
    return { ...useKeys() };
  },
});
</script>
