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
      height="325px"
      navigation
      navigation-icon="fas fa-circle"
      ref="carousel"
      style="max-width: 800px"
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
            <!-- User has no ENS or CNS names -->
            <div v-if="!userEns && !userCns">
              <p>
                An ENS domain was not found for this address. If you do have an address, please set the reverse record.
              </p>
              <p>
                To continue, register a subdomain below, or visit the
                <a class="hyperlink" href="https://app.ens.domains" target="_blank">ENS site</a> to register and
                configure your own name.
              </p>
              <account-setup-register-ens-subdomain />
            </div>
            <!-- User has ENS and CNS name, and has not yet chose one -->
            <div v-else-if="userEns && userCns && !selectedName">
              <div>Please choose a name to continue</div>
              <div class="row justify-start q-mt-lg">
                <base-button @click="setName(userEns)" :label="userEns" :outline="true" />
                <base-button @click="setName(userCns)" :label="userCns" :outline="true" class="q-ml-lg" />
              </div>
            </div>
            <!-- User only has ENS, or user chose to use ENS -->
            <div v-else-if="(userEns && !userCns) || selectedNameType === 'ens'">
              <!-- Loading ENS config status -->
              <div v-if="ensStatus === 'not-ready'" class="text-center">
                <loading-spinner />
              </div>
              <!-- User does is not set as the owner -->
              <div v-else-if="ensStatus === 'not-owner'">
                <p>
                  You are connected with <span class="text-bold">{{ userEns }}</span
                  >, but are not the controller of that name.
                </p>
                <p>
                  To continue, register a subdomain below, become the controller of this name, or switch to an ENS name
                  you are the controller of.
                </p>
                <account-setup-register-ens-subdomain />
              </div>
              <!-- User is not using the Public Resolver -->
              <div v-else-if="ensStatus === 'not-public-resolver'">
                <p>
                  You are connected with <span class="text-bold">{{ userEns }}</span
                  >, but are not using the Public Resolver.
                </p>
                <p>
                  To continue, register a subdomain below, or
                  <a class="hyperlink" :href="`https://app.ens.domains/name/${userEns}`" target="_blank">configure</a>
                  your name to use the Public Resolver.
                </p>
                <account-setup-register-ens-subdomain />
              </div>
              <div v-else>
                You are connected with <span class="text-bold">{{ userEns }}</span
                >. Please continue to the next step.
              </div>
            </div>
            <!-- User only has CNS, or use chose to use CNS -->
            <div v-else-if="(!userEns && userCns) || selectedNameType === 'cns'">
              You are connected with <span class="text-bold">{{ userCns }}</span
              >. Please continue to the next step.
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
          <base-button @click="getPrivateKeysHandler" :disable="isWaiting" :loading="isWaiting" label="Sign" />
        </div>
      </q-carousel-slide>

      <!-- Step 3: Save private keys to ENS -->
      <q-carousel-slide name="3" class="q-px-xl">
        <div class="q-mx-xl q-pb-xl">
          <h5 class="q-my-md q-pt-none">Step 3: Publish Keys</h5>
          <!-- User is migrating their own ENS name from public resolver -->
          <div v-if="!isSubdomain && isEnsPublicResolver && ensStatus === 'no-public-keys'">
            <p>
              <span class="text-bold">You'll now be asked to approve three transactions</span> to upgrade your ENS name
              from the Public Resolver to Umbra's Resolver and publish your public keys. Your existing ENS configuration
              will carry over, and you'll be able to continue using ENS like normal.
            </p>
            <p>
              To learn more, read
              <a class="hyperlink" href="https://github.com/ScopeLift/umbra-protocol/issues/113" target="_blank">
                here</a
              >.
            </p>
            <base-button @click="migrateKeys" :disable="isWaiting" :loading="isWaiting" label="Publish keys" />
          </div>
          <!-- User does not need to migrate from public resolver-->
          <div v-else>
            <p class="q-mt-md">
              You'll now be asked to send a transaction which associates the two public keys generated with
              {{ userAddress.value }}. This means people can now securely send you funds through Umbra by visiting this
              site and sending funds to {{ userAddress.value }}.
            </p>
            <base-button @click="migrateKeys" :disable="isWaiting" :loading="isWaiting" label="Publish keys" />
          </div>
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
import { computed, defineComponent, onMounted, ref, watch } from '@vue/composition-api';
import { ens, cns } from '@umbra/umbra-js';
import AccountSetupRegisterEnsSubdomain from 'src/components/AccountSetupRegisterEnsSubdomain.vue';
import ConnectWalletCard from 'components/ConnectWalletCard.vue';
import { Provider, TransactionResponse } from 'components/models';
import useWalletStore from 'src/store/wallet';
import useAlerts from 'src/utils/alerts';
import * as ensHelpers from 'src/utils/ens';
import { addresses as fskResolverAddresses } from 'src/contracts/ForwardingStealthKeyResolver.json';

function useKeys() {
  const {
    domainService,
    getPrivateKeys,
    userAddress,
    userEns,
    userCns,
    spendingKeyPair,
    viewingKeyPair,
    signer,
  } = useWalletStore();
  const { notifyUser, txNotify } = useAlerts();
  const selectedName = ref<string>(); // ENS or CNS name to be configured
  const selectedNameType = ref<'ens' | 'cns'>(); // 'ens' if user chose ENS, 'cns' if user chose CNS
  const ensSubdomain = ref<string>();
  const carouselBtnRight = ref<QBtn>();
  const ensStatus = ref<'not-ready' | 'not-owner' | 'not-public-resolver' | 'no-public-keys' | 'ready'>('not-ready');
  const isEnsPublicResolver = ref(false); // true if user currently has the ENS public resolver, false otherwise
  const keyStatus = ref<'waiting' | 'success' | 'denied'>('waiting');
  const carouselStep = ref('1');
  const isWaiting = ref(false);

  const isSubdomain = computed(() => userEns.value?.endsWith('.umbra.eth'));
  const setName = (name: string) => (selectedName.value = name);
  onMounted(() => checkAndSetName());

  // Required for UI to update if user connects wallet when already on this page
  watch(userAddress, () => checkAndSetName());

  // Fetch latest status for the selected ENS name
  watch(selectedName, async (newName) => {
    // Determine if user chose ENS or CNS
    if (!newName) selectedNameType.value = undefined;
    else if (ens.isEnsDomain(newName)) selectedNameType.value = 'ens';
    else if (cns.isCnsDomain(newName)) selectedNameType.value = 'cns';
    else selectedNameType.value = undefined; // if here, it's some type of unsupported or invalid domain

    // If ENS, check if they are ready to continue
    if (selectedNameType.value === 'ens') {
      ensStatus.value = await checkEnsStatus(newName as string);
    }
  });

  function checkAndSetName() {
    // If the user has already selected which name to configure, we return and do nothing. Otherwise, we select
    // a domain name based on which type their address owns. If neither condition is true, migrateKeys() will throw
    // an error later
    if (selectedName.value) return;
    else if (userEns.value && !userCns.value) setName(userEns.value);
    else if (!userEns.value && userCns.value) setName(userCns.value);
  }

  // Check if user's ENS name is properly configured to support setting their public keys
  async function checkEnsStatus(name: string) {
    const address = userAddress.value as string;
    const provider = signer.value?.provider as Provider;

    const ownsName = await ensHelpers.isNameOwner(address, name, provider);
    if (!ownsName) return 'not-owner';

    const currentResolver = await ensHelpers.getResolverAddress(name, provider);
    isEnsPublicResolver.value = ensHelpers.isUsingPublicResolver(currentResolver, provider);
    const isUmbraResolver = ensHelpers.isUsingUmbraResolver(currentResolver, provider);
    if (!isEnsPublicResolver.value && !isUmbraResolver) return 'not-public-resolver';

    const didSetPublicKeys = await ensHelpers.hasPublicKeys(name, provider);
    if (!didSetPublicKeys) return 'no-public-keys';

    carouselBtnRight.value?.click();
    return 'ready';
  }

  async function getPrivateKeysHandler() {
    if (keyStatus.value === 'success') {
      notifyUser('info', 'You have already signed. Please continue to the next step');
      return;
    }
    try {
      isWaiting.value = true;
      keyStatus.value = await getPrivateKeys();
      carouselBtnRight.value?.click();
    } finally {
      isWaiting.value = false;
    }
  }

  // Migrate from ENS Public Resolver to Umbra Resolver
  async function migrateKeys() {
    // Validation
    if (!domainService.value) throw new Error('Invalid DomainService. Please refresh the page');
    if (!signer.value) throw new Error('migrateKeys: Invalid provider');
    checkAndSetName(); // does nothing if already set, and sets name if user only has one of ENS or CNS
    if (!selectedName.value) throw new Error('ENS or CNS name not found. Please return to the first step');
    const hasKeys = spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex;
    if (!hasKeys) throw new Error('Missing keys. Please return to the previous step');

    try {
      // Setup
      isWaiting.value = true;
      const name = String(selectedName.value);
      const node = ens.namehash(name);
      const provider = signer.value.provider as Provider;
      const txs: TransactionResponse[] = []; // this will hold tx details from each transaction sent

      // Get address of the ForwardingStealthKeyResolver. This is only used with ENS, not for CNS.
      // For brevity we use fsk = ForwardingStealthKey
      const chainId = String((await provider.getNetwork()).chainId) as keyof typeof fskResolverAddresses;
      const fskResolverAddress = fskResolverAddresses[chainId];

      // Now we execute the transactions needed to set the keys and optionally migrate resolver. If we're executing
      // here, there's four potential resolvers the user may have
      //   1. ENS PublicResolver (the ENS default)
      //   2. ENS PublicStealthKeyResolver (typically used when registering an umbra.eth subdomain)
      //   3. ENS ForwardingStealthKeyResolver (typically used when configuring a root ENS name, e.g. msolomon.eth)
      //   4. CNS PublicResolver
      // The first and third transactions below are only needed when migrating from the PublicResolver, and the
      // second transaction below is needed in all three cases. We use isEnsPublicResolver.value, which was set
      // in checkEnsStatus(), to handle this logic

      // Step 1: Authorize the ForwardingStealthKeyResolver to set records on the PublicResolver. This is required
      // so it can properly act as a fallback resolver with permission to set records on PublicResolver as needed
      if (isEnsPublicResolver.value) {
        const publicResolver = ensHelpers.getContract('ENSPublicResolver', provider).connect(signer.value);
        const tx = (await publicResolver.setAuthorisation(node, fskResolverAddress, true)) as TransactionResponse;
        txNotify(tx.hash);
        txs.push(tx);
      }

      // Step 2: Set the stealth keys on the appropriate resolver
      const spendingPubKey = String(spendingKeyPair.value?.publicKeyHex);
      const viewingPubKey = String(viewingKeyPair.value?.publicKeyHex);
      const tx = await domainService.value.setPublicKeys(name, spendingPubKey, viewingPubKey);
      txNotify(tx.hash);
      txs.push(tx);

      // Step 3: Change the user's resolver to the ForwardingStealthKeyResolver
      if (isEnsPublicResolver.value) {
        // Execute the setResolver transaction
        const registry = ensHelpers.getContract('ENSRegistry', provider).connect(signer.value);
        const tx = (await registry.setResolver(node, fskResolverAddress)) as TransactionResponse;
        txNotify(tx.hash);
        txs.push(tx);
      }

      // Wait for all transactions to be mined then move on to next step
      await Promise.all(txs.map((tx) => tx.wait()));
      carouselStep.value = '4';
    } finally {
      isWaiting.value = false;
    }
  }

  return {
    carouselBtnRight,
    carouselStep,
    ensStatus,
    ensSubdomain,
    getPrivateKeysHandler,
    isEnsPublicResolver,
    isSubdomain,
    isWaiting,
    keyStatus,
    migrateKeys,
    selectedName,
    selectedNameType,
    setName,
    userAddress,
    userCns,
    userEns,
  };
}

export default defineComponent({
  components: { AccountSetupRegisterEnsSubdomain, ConnectWalletCard },
  name: 'PageSetup',
  setup() {
    const open = (url: string) => window.open(url, '_self');
    return { open, ...useKeys() };
  },
});
</script>
