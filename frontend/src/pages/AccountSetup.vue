<template>
  <q-page padding>
    <h1 class="page-title">Setup</h1>

    <q-carousel
      v-model="carouselStep"
      animated
      class="shadow-2 rounded-borders"
      control-color="black"
      height="300px"
      navigation
      navigation-icon="fas fa-circle"
      ref="carousel"
      swipeable
      transition-next="slide-left"
      transition-prev="slide-right"
    >
      <!-- Carousel Navigation Buttons -->
      <template v-slot:control>
        <q-carousel-control v-if="carouselStep !== '1'" position="left" class="row">
          <q-btn
            class="q-my-auto"
            flat
            text-color="black"
            icon="fas fa-arrow-left"
            @click="$refs.carousel.previous()"
          />
        </q-carousel-control>
        <q-carousel-control v-if="carouselStep !== '3'" position="right" class="row">
          <q-btn
            class="q-my-auto"
            flat
            text-color="black"
            icon="fas fa-arrow-right"
            @click="$refs.carousel.next()"
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
                An ENS domain was not found for this address. If you do have an address, make sure
                the reverse record is set.
              </p>
              <p>
                Either login with a different address and refresh the page, or follow
                <a
                  class="hyperlink"
                  href="https://medium.com/@eric.conner/the-ultimate-guide-to-ens-names-aa541586067a"
                  target="_blank"
                  >this guide</a
                >
                to learn how to purchase a domain and configure it to resolve to your Ethereum
                address. Be sure to use the Public Resolver and set the reverse record.
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
              Use the button below to sign a message, which will be used to generate an
              Umbra-specific pair of private keys. These keys allow you to securely use Umbra
              without compromising the private keys of your connected wallet.
            </p>
            <p>You do not need to save these keys anywhere!</p>
          </div>
          <base-button @click="getPrivateKeysHandler" label="Sign" />
        </div>
      </q-carousel-slide>

      <!-- Step 3: Save private keys to ENS -->
      <q-carousel-slide name="3" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">Step 3: Publish Keys</h5>
          <div class="q-mt-md">
            You'll now be asked to send a transaction which associates the two public keys generated
            with {{ userAddress.value }}. This means people can now securely send you funds through
            Umbra by visiting this site and sending funds to {{ userAddress.value }}
          </div>
          <base-button @click="publishKeys" label="Publish keys" />
        </div>
      </q-carousel-slide>
    </q-carousel>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { TransactionResponse } from '@ethersproject/providers';
import BaseButton from 'src/components/BaseButton.vue';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';

function useKeys() {
  const {
    domainService,
    getPrivateKeys,
    userAddress,
    userEns,
    spendingKeyPair,
    viewingKeyPair,
  } = useWalletStore();
  const { txNotify } = useAlerts();

  const keyStatus = ref<'waiting' | 'success' | 'denied'>('waiting');
  const carouselStep = ref('1');

  async function getPrivateKeysHandler() {
    keyStatus.value = await getPrivateKeys();
  }

  async function publishKeys() {
    if (!domainService.value) throw new Error('Invalid DomainService. Please refresh the page');
    if (!userEns.value) throw new Error('Invalid ENS or CNS name. Please return to the first step');
    const hasKeys = spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex;
    if (!hasKeys) throw new Error('Missing keys. Please return to the previous step');
    const tx = (await domainService.value.setPublicKeys(
      userEns.value,
      String(spendingKeyPair.value?.publicKeyHex),
      String(viewingKeyPair.value?.publicKeyHex)
    )) as TransactionResponse;
    txNotify(tx.hash);
    await tx.wait();
  }

  return { carouselStep, userAddress, userEns, keyStatus, getPrivateKeysHandler, publishKeys };
}

export default defineComponent({
  components: { BaseButton },
  name: 'PageSetup',
  setup() {
    return { ...useKeys() };
  },
});
</script>
