<template>
  <q-page padding>
    <h2 class="page-title">Setup</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">Connect your wallet to setup your account</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" label="Connect Wallet" />
        </connect-wallet>
      </div>
    </div>

    <!-- Walk through of process -->
    <q-carousel
      v-else
      v-model="carouselStep"
      :swipeable="$q.screen.xs"
      animated
      class="shadow-2 rounded-borders q-mx-auto"
      :control-color="carouselStep !== '4' ? 'grey' : undefined"
      :height="$q.screen.xs ? '90vh' : '325px'"
      navigation
      navigation-icon="fas fa-circle"
      ref="carousel"
      style="max-width: 800px"
      transition-next="slide-left"
      transition-prev="slide-right"
    >
      <!-- Carousel Arrow Navigation Buttons, hidden on step 4 (the success step) -->
      <template v-slot:control v-if="!$q.screen.xs && carouselStep !== '4'">
        <q-carousel-control v-if="carouselStep !== '1'" position="left" class="row">
          <q-btn @click="$refs.carousel.previous()" class="q-my-auto" flat icon="fas fa-arrow-left" text-color="grey" />
        </q-carousel-control>
        <q-carousel-control v-if="carouselStep !== '3'" position="right" class="row">
          <q-btn
            @click="$refs.carousel.next()"
            class="q-my-auto"
            :disable="
              (selectedNameType === 'ens' && !['ready', 'no-public-keys'].includes(ensStatus)) ||
              (carouselStep === '1' && !selectedNameType) ||
              (carouselStep === '2' && keyStatus !== 'success')
            "
            flat
            icon="fas fa-arrow-right"
            ref="carouselBtnRight"
            text-color="grey"
          />
        </q-carousel-control>
      </template>

      <!-- Carousel Circular Step Indicator Icons -->
      <template v-slot:navigation-icon="{ active }">
        <q-btn v-if="active" :color="isDark ? 'grey-6' : 'grey-5'" icon="fas fa-circle" flat size="xs" class="no-ptr" />
        <q-btn v-else :color="isDark ? 'grey-8' : 'grey-3'" icon="fas fa-circle" flat size="xs" class="no-ptr" />
      </template>

      <!-- Step 1: ENS Registration -->
      <q-carousel-slide name="1" :class="{ 'q-px-xl': !$q.screen.xs }">
        <div :class="{ 'q-mx-xl': !$q.screen.xs, 'q-pb-xl': true }">
          <h5 class="q-my-md q-pt-none">Step 1: Username Selection</h5>
          <div class="q-mt-md">
            <!-- User has no ENS or CNS names -->
            <div v-if="!userEns && !userCns">
              <p>An ENS name was not found for this address. To continue, register a subdomain below.</p>
              <account-setup-set-ens-subdomain @subdomain-selected="setSubdomain" />
            </div>
            <!-- User has ENS and CNS name, and has not yet chose one -->
            <div v-else-if="(userEns || userCns) && !selectedName">
              <div>Please choose an ENS or CNS name to continue.</div>
              <div class="row justify-start q-mt-lg">
                <base-button v-if="userEns" @click="setName(userEns)" :label="userEns" :outline="true" />
                <base-button
                  v-if="userCns"
                  @click="setName(userCns)"
                  :label="userCns"
                  :outline="true"
                  class="q-ml-lg"
                />
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
                  To continue, become the controller of this name, or switch to an ENS name you are the controller of.
                </p>
              </div>
              <!-- User is not using the Public Resolver -->
              <div v-else-if="ensStatus === 'not-public-resolver'">
                <p>
                  You are connected with <span class="text-bold">{{ userEns }}</span
                  >, but are not using the Public Resolver.
                </p>
                <p>
                  To continue,
                  <a class="hyperlink" :href="`https://app.ens.domains/name/${userEns}`" target="_blank">configure</a>
                  your name to use the Public Resolver.
                </p>
              </div>
              <div v-else>
                <p>
                  Click the arrow to continue with <span class="text-bold">{{ userEns }}</span>
                </p>
              </div>
            </div>
            <!-- User only has CNS, or use chose to use CNS -->
            <div v-else-if="(!userEns && userCns) || selectedNameType === 'cns'">
              <p>
                Click the arrow to continue with <span class="text-bold">{{ userCns }}</span>
              </p>
            </div>
          </div>
        </div>
      </q-carousel-slide>

      <!-- Step 2: Get Signature -->
      <q-carousel-slide name="2" :class="{ 'q-px-xl': !$q.screen.xs }">
        <div :class="{ 'q-mx-xl': !$q.screen.xs, 'q-pb-xl': true }">
          <h5 class="q-my-md q-pt-none">Step 2: Generate Keys</h5>
          <div class="q-mt-md">
            <p>
              Use the button below to sign a message, which will be used to generate an Umbra-specific pair of private
              keys. These keys allow you to securely use Umbra without compromising the private keys of your connected
              wallet.
            </p>
            <p>You do not need to save these keys anywhere!</p>
          </div>
          <base-button
            @click="getPrivateKeysHandler"
            :disable="isWaiting"
            :loading="isWaiting"
            :fullWidth="$q.screen.xs"
            label="Sign"
          />
        </div>
      </q-carousel-slide>

      <!-- Step 3: Save private keys to ENS -->
      <q-carousel-slide name="3" :class="{ 'q-px-xl': !$q.screen.xs }">
        <div :class="{ 'q-mx-xl': !$q.screen.xs, 'q-pb-xl': true }">
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
            <base-button
              @click="setKeys"
              :disable="isWaiting"
              :loading="isWaiting"
              :fullWidth="$q.screen.xs"
              label="Publish keys"
            />
          </div>
          <!-- User does not need to migrate from public resolver-->
          <div v-else>
            <p class="q-mt-md">
              You'll now be asked to approve two transactions which associate the two public keys generated from your
              wallet with <span class="text-bold">{{ selectedName }}</span
              >. This means people can now securely send you funds through Umbra by visiting this site and sending funds
              to <span class="text-bold">{{ selectedName }}</span
              >.
            </p>
            <base-button
              @click="setKeys"
              :disable="isWaiting"
              :loading="isWaiting"
              :fullWidth="$q.screen.xs"
              label="Publish keys"
            />
          </div>
        </div>
      </q-carousel-slide>

      <!-- Step 4: Success -->
      <q-carousel-slide name="4" :class="{ 'q-px-xl': !$q.screen.xs }">
        <div :class="{ 'q-mx-xl': !$q.screen.xs, 'q-pb-xl': true }">
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
import { QBtn, Dark } from 'quasar';
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import { ens, cns } from '@umbra/umbra-js';
import AccountSetupSetEnsSubdomain from 'src/components/AccountSetupSetEnsSubdomain.vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { Provider, TransactionResponse } from 'components/models';
import useWalletStore from 'src/store/wallet';
import { notifyUser } from 'src/utils/alerts';
import * as ensHelpers from 'src/utils/ens';

function useKeys() {
  // prettier-ignore
  const { domainService, getPrivateKeys, userAddress, userEns, userCns, spendingKeyPair, viewingKeyPair, signer, setHasEnsKeys, setHasCnsKeys } = useWalletStore();
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

  // Uncomment the helpers below if you want to auto-select a name when there is only one name to choose from
  // watch(userAddress, () => checkAndSetName()); // uncomment for UI to automatically select name if user connects wallet when on this page
  // onMounted(() => checkAndSetName()); // uncomment to automatically select name on load

  // Fetch latest status for the selected ENS name
  watch(selectedName, async (newName) => {
    // Determine if user chose ENS or CNS
    if (!newName) selectedNameType.value = undefined;
    else if (ens.isEnsDomain(newName)) selectedNameType.value = 'ens';
    else if (cns.isCnsDomain(newName)) selectedNameType.value = 'cns';
    else selectedNameType.value = undefined; // if here, it's some type of unsupported or invalid domain

    // Check if user is ready to continue, and automatically advance to the next step when safe
    if (selectedNameType.value === 'ens') ensStatus.value = await checkEnsStatus(newName as string);
    else if (selectedNameType.value === 'cns') carouselBtnRight.value?.click(); // always safe to advance for CNS
    window.logger.debug('selectedName:', selectedName.value);
    window.logger.debug('selectedNameType:', selectedNameType.value);
  });

  function checkAndSetName() {
    // If the user has already selected which name to configure, return and do nothing. Otherwise, select a domain name
    // based on which type their address owns. If neither condition is true, setKeys() will throw an error later
    if (selectedName.value) return;
    else if (userEns.value && !userCns.value) setName(userEns.value);
    else if (!userEns.value && userCns.value) setName(userCns.value);
  }

  // Handler for subdomains
  function setSubdomain(payload: { name: string }) {
    setName(payload.name);
    carouselBtnRight.value?.click();
  }

  // Check if user's ENS name is properly configured to support setting their public keys
  async function checkEnsStatus(name: string) {
    const address = userAddress.value as string;
    const provider = signer.value?.provider as Provider;
    window.logger.debug('address: ', address);
    window.logger.debug('name: ', name);

    const ownsName = await ensHelpers.isNameOwner(address, name, provider);
    window.logger.debug('ownsName: ', ownsName);
    if (!ownsName) return 'not-owner';

    const currentResolver = await ensHelpers.getResolverAddress(name, provider);
    window.logger.debug('currentResolver: ', currentResolver);
    isEnsPublicResolver.value = ensHelpers.isUsingPublicResolver(currentResolver, provider);
    window.logger.debug('isEnsPublicResolver.value: ', isEnsPublicResolver.value);
    const isUmbraResolver = ensHelpers.isUsingUmbraResolver(currentResolver, provider);
    window.logger.debug('isUmbraResolver: ', isUmbraResolver);
    if (!isEnsPublicResolver.value && !isUmbraResolver) return 'not-public-resolver';

    const didSetPublicKeys = await ensHelpers.hasPublicKeys(name, provider);
    window.logger.debug('didSetPublicKeys: ', didSetPublicKeys);
    if (!didSetPublicKeys) {
      carouselBtnRight.value?.click();
      return 'no-public-keys';
    }

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
  async function setKeys() {
    // Validation
    if (!domainService.value) throw new Error('Invalid DomainService. Please refresh the page');
    if (!signer.value) throw new Error('Signer not found. Please connect a wallet');
    checkAndSetName(); // does nothing if already set, and sets name if user only has one of ENS or CNS
    if (!selectedName.value) throw new Error('ENS or CNS name not found. Please return to the first step');
    const hasKeys = spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex;
    if (!hasKeys) throw new Error('Missing keys. Please return to the previous step');

    try {
      isWaiting.value = true;
      const name = selectedName.value;
      window.logger.debug('name: ', name);
      const spendingPubKey = String(spendingKeyPair.value?.publicKeyHex);
      const viewingPubKey = String(viewingKeyPair.value?.publicKeyHex);
      const txs: TransactionResponse[] = []; // this will hold tx details from each transaction sent

      // Set keys (user alerts of transaction status are fired off in the setter methods used below)
      if (name.endsWith(ensHelpers.rootName)) {
        // If setting a subdomain
        const userAddr = userAddress.value;
        window.logger.debug('userAddress.value: ', userAddress.value);
        if (!userAddr) throw new Error('User address not found. Please connect a wallet');
        const allTxs = await ensHelpers.setSubdomainKeys(name, userAddr, spendingPubKey, viewingPubKey, signer.value);
        txs.push(...allTxs);
      } else {
        // If setting a regular name
        const allTxs = await ensHelpers.setRootNameKeys(
          name,
          domainService.value,
          isEnsPublicResolver.value,
          spendingPubKey,
          viewingPubKey,
          signer.value
        );
        txs.push(...allTxs);
      }

      // Wait for all transactions to be mined then move on to next step
      window.logger.debug('txs: ', txs);
      await Promise.all(txs.map((tx) => tx.wait()));
      carouselStep.value = '4';
      ens.isEnsDomain(selectedName.value) ? setHasEnsKeys(true) : setHasCnsKeys(true); // hide account setup on home page
      isWaiting.value = false;
    } catch (err) {
      isWaiting.value = false;
      throw err;
    }
  }

  return {
    carouselBtnRight,
    carouselStep,
    ensStatus,
    ensSubdomain,
    getPrivateKeysHandler,
    isDark: Dark.isActive,
    isEnsPublicResolver,
    isSubdomain,
    isWaiting,
    keyStatus,
    selectedName,
    selectedNameType,
    setKeys,
    setName,
    setSubdomain,
    userAddress,
    userCns,
    userEns,
  };
}

export default defineComponent({
  components: { AccountSetupSetEnsSubdomain, ConnectWallet },
  name: 'PageSetup',
  setup() {
    const open = (url: string) => window.open(url, '_self');
    return { open, ...useKeys() };
  },
});
</script>

<style lang="sass" scoped>
.no-ptr
  cursor: auto // disable cursor pointer the icons have by default
  pointer-events: none // disable hover effect the icons have by default
</style>
