<template>
  <q-page padding class="text-center">
    <h2 class="page-title">{{ $t('FAQ.faq') }}</h2>
    <q-list class="form-extra-wide" separator>
      <!-- Introduction -->
      <div
        @click="copyUrl"
        id="introduction"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.intro') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-umbra">
        <f-a-q-item :expanded="selectedId === 'what-is-umbra'" :question="$t('FAQ.what-is-umbra')">
          <div v-html="$t('FAQ.what-is-umbra-answer')"></div>
          <div>
            <img src="/umbra-diagram.png" style="display: block; width: 100%" />
          </div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="can-you-walk-me-through-an-example">
        <f-a-q-item :expanded="selectedId === 'can-you-walk-me-through-an-example'" :question="$t('FAQ.an-example')">
          <div v-html="$t('FAQ.an-example-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="does-umbra-have-a-token">
        <f-a-q-item :expanded="selectedId === 'does-umbra-have-a-token'" :question="$t('FAQ.wen-token')">
          <div v-html="$t('FAQ.wen-token-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-does-it-work">
        <f-a-q-item :expanded="selectedId === 'how-does-it-work'" :question="$t('FAQ.how-does-it-work')">
          <div v-html="$t('FAQ.how-does-it-work-answer')"></div>
          <i18n-t scope="global" keypath="FAQ.how-does-it-work-see-the" tag="p">
            <span class="hyperlink" @click="expandAndScrollToElement('how-does-it-work-technical')">{{
              $t('FAQ.how-does-it-work-technical-details')
            }}</span>
          </i18n-t>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-private-is-umbra">
        <f-a-q-item :expanded="selectedId === 'how-private-is-umbra'" :question="$t('FAQ.how-private')">
          <div v-html="$t('FAQ.how-private-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="is-umbra-a-mixer">
        <f-a-q-item :expanded="selectedId === 'is-umbra-a-mixer'" :question="$t('FAQ.umbra-vs-mixer')">
          <div v-html="$t('FAQ.umbra-vs-mixer-answer')"></div>
        </f-a-q-item>
      </div>

      <!-- Account Setup -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="account-setup"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.account-setup') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-account-setup">
        <f-a-q-item :expanded="selectedId === 'what-is-account-setup'" :question="$t('FAQ.what-is-setup')">
          <div v-html="$t('FAQ.what-is-setup-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="is-account-setup-required">
        <f-a-q-item :expanded="selectedId === 'is-account-setup-required'" :question="$t('FAQ.is-setup-required')">
          <div v-html="$t('FAQ.is-setup-required-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-do-i-need-to-setup-my-account-again">
        <f-a-q-item
          :expanded="selectedId === 'why-do-i-need-to-setup-my-account-again'"
          :question="$t('FAQ.why-setup-again')"
        >
          <div v-html="$t('FAQ.why-setup-again-answer')"></div>
          <i18n-t scope="global" keypath="FAQ.why-setup-again-answer-issue" tag="p">
            <a href="https://github.com/ScopeLift/umbra-protocol/issues/214" class="hyperlink" target="_blank">{{
              $t('FAQ.why-setup-again-answer-this-issue')
            }}</a>
          </i18n-t>
        </f-a-q-item>
      </div>

      <!-- Sending Funds -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="sending-funds"
        isHeader="true"
        class="cursor-pointer link-icon-parent cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.sending-funds') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="why-are-only-certain-tokens-available">
        <f-a-q-item
          :expanded="selectedId === 'why-are-only-certain-tokens-available'"
          :question="$t('FAQ.why-only-tokens')"
        >
          <div v-html="$t('FAQ.why-only-tokens-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="when-will-the-recipient-receive-their-funds">
        <f-a-q-item :expanded="selectedId === false" :question="$t('FAQ.when-receive')">
          <div v-html="$t('FAQ.when-receive-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-is-there-a-minimum-send-amount">
        <f-a-q-item :expanded="selectedId === 'why-is-there-a-minimum-send-amount'" :question="$t('FAQ.min-amount')">
          <div v-html="$t('FAQ.min-amount-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-is-there-sometimes-an-umbra-fee">
        <f-a-q-item :expanded="selectedId === 'why-is-there-sometimes-an-umbra-fee'" :question="$t('FAQ.umbra-fee')">
          <div v-html="$t('FAQ.umbra-fee-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-payment-links">
        <f-a-q-item :expanded="selectedId === 'what-are-payment-links'" :question="$t('FAQ.payment-links')">
          <div v-html="$t('FAQ.payment-links-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-cant-I-see-my-send-history-on-different-devices">
        <f-a-q-item
          :expanded="selectedId === 'why-cant-I-see-my-send-history-on-different-devices'"
          :question="$t('FAQ.send-history-different-devices')"
        >
          <div v-html="$t('FAQ.send-history-different-devices-answer')"></div>
        </f-a-q-item>
      </div>

      <!-- Receiving Funds -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="receiving-funds"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.receiving-funds') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-addresses-are-safe-for-withdrawing-funds-to">
        <f-a-q-item
          :expanded="selectedId === 'what-addresses-are-safe-for-withdrawing-funds-to'"
          :question="$t('FAQ.safe-address')"
        >
          <div v-html="$t('FAQ.safe-address-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-addresses-are-not-safe-for-withdrawing-funds-to">
        <f-a-q-item
          :expanded="selectedId === 'what-addresses-are-not-safe-for-withdrawing-funds-to'"
          :question="$t('FAQ.non-safe-address')"
        >
          <div v-html="$t('FAQ.non-safe-address-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="can-umbra-make-it-easier-to-withdraw-funds-in-a-privacy-preserving-way">
        <f-a-q-item
          :expanded="selectedId === 'can-umbra-make-it-easier-to-withdraw-funds-in-a-privacy-preserving-way'"
          :question="$t('FAQ.umbra-withdrawal')"
        >
          <div v-html="$t('FAQ.umbra-withdrawal-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="why-does-it-take-so-long-to-scan-for-my-funds">
        <f-a-q-item
          :expanded="selectedId === 'why-does-it-take-so-long-to-scan-for-my-funds'"
          :question="$t('FAQ.scan-time')"
        >
          <div v-html="$t('FAQ.scan-time-answer')"></div>
          <i18n-t scope="global" keypath="FAQ.scan-time-answer-issue" tag="p">
            <template v-slot:one>
              <a
                class="hyperlink"
                href="https://ethresear.ch/t/open-problem-improving-stealth-addresses/7438"
                target="_blank"
                >1</a
              >,
            </template>
            <template v-slot:two>
              <a class="hyperlink" href="https://eprint.iacr.org/2021/089.pdf" target="_blank">2</a>
            </template>
          </i18n-t>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="when-are-my-funds-available-to-withdraw">
        <f-a-q-item
          :expanded="selectedId === 'when-are-my-funds-available-to-withdraw'"
          :question="$t('FAQ.when-withdrawal')"
        >
          <div v-html="$t('FAQ.when-withdrawal-answer')"></div>
        </f-a-q-item>
      </div>

      <!-- Security -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="security"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.security') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="has-umbra-been-audited">
        <f-a-q-item :expanded="selectedId === 'has-umbra-been-audited'" :question="$t('FAQ.audit')">
          <i18n-t scope="global" keypath="FAQ.audit-answer-contract" tag="p">
            <template v-slot:contracts>
              <a
                class="hyperlink"
                href="https://github.com/ScopeLift/umbra-protocol/tree/master/contracts"
                target="_blank"
                >{{ $t('FAQ.audit-contracts') }}</a
              >
            </template>
            <template v-slot:here>
              <a
                class="hyperlink"
                href="https://consensys.net/diligence/audits/2021/03/umbra-smart-contracts/"
                target="_blank"
                >{{ $t('FAQ.audit-here') }}</a
              >
            </template>
          </i18n-t>

          <i18n-t scope="global" keypath="FAQ.audit-answer-umbra-js" tag="p">
            <template v-slot:umbrajs> <span class="code">umbra-js</span>&#32; </template>
            <template v-slot:library>
              <a
                class="hyperlink"
                href="https://github.com/ScopeLift/umbra-protocol/tree/master/umbra-js"
                target="_blank"
                >{{ $t('FAQ.audit-library') }}</a
              >&mdash;
            </template>
            <template v-slot:here>
              <a
                class="hyperlink"
                href="https://leastauthority.com/static/publications/LeastAuthority_ScopeLift_Umbra-js_Final_Audit_Report.pdf"
                target="_blank"
                >{{ $t('FAQ.audit-here') }}</a
              >
            </template>
          </i18n-t>

          <i18n-t scope="global" keypath="FAQ.audit-answer-umbra-off-chain" tag="p">
            <template v-slot:PaulMillers>
              <a class="hyperlink" href="https://paulmillr.com/" target="_blank">Paul Miller</a>
            </template>
            <template v-slot:nobleSecp256k1>
              <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1" target="_blank"
                >noble-secp256k1</a
              >
            </template>
            <template v-slot:community>
              <a
                class="hyperlink"
                href="https://gitcoin.co/grants/2451/audit-of-noble-secp256k1-cryptographic-library"
                target="_blank"
                >{{ $t('FAQ.audit-community') }}</a
              >
            </template>
            <template v-slot:here>
              <a class="hyperlink" href="https://cure53.de/pentest-report_noble-lib.pdf" target="_blank">{{
                $t('FAQ.audit-here')
              }}</a>
            </template>
          </i18n-t>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-the-risks-of-umbra">
        <f-a-q-item :expanded="selectedId === false" :question="$t('FAQ.umbra-risk')">
          <div v-html="$t('FAQ.umbra-risk-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="is-cryptography-in-javascript-secure">
        <f-a-q-item :expanded="selectedId === 'is-cryptography-in-javascript-secure'" :question="$t('FAQ.crypto-js')">
          <i18n-t scope="global" keypath="FAQ.crypto-js-answer" tag="p">
            <template v-slot:timingAttacks>
              <a class="hyperlink" href="https://en.wikipedia.org/wiki/Timing_attack" target="_blank">{{
                $t('FAQ.crypto-js-timing-attacks')
              }}</a>
            </template>
            <template v-slot:nobleSecp256k1>
              <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1" target="_blank"
                >noble-secp256k1</a
              >
            </template>
            <template v-slot:here>
              <a class="hyperlink" href="https://github.com/paulmillr/noble-secp256k1/#security" target="_blank">{{
                $t('FAQ.crypto-js-here')
              }}</a>
            </template>
          </i18n-t>
          <div v-html="$t('FAQ.crypto-js-answer-rest')"></div>
        </f-a-q-item>
      </div>

      <!-- Technical Details -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="technical-details"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.tech-details') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-networks-is-umbra-deployed-on-and-what-are-the-contract-addresses">
        <f-a-q-item
          :expanded="selectedId === 'what-networks-is-umbra-deployed-on-and-what-are-the-contract-addresses'"
          :question="$t('FAQ.network-addrs')"
        >
          <ul>
            <i18n-t scope="global" keypath="FAQ.network-addrs-core" tag="li">
              <template v-slot:umbra>
                <span class="code">Umbra</span>
              </template>
              <template v-slot:umbraAddr>
                <span class="code">{{ deployments.umbra }}</span>
              </template>
              <template v-slot:mainnet>
                <a :href="getEtherscanUrl(deployments.umbra, 1)" class="hyperlink" target="_blank"> mainnet </a>
              </template>
              <template v-slot:sepolia>
                <a :href="getEtherscanUrl(deployments.umbra, 11155111)" class="hyperlink" target="_blank"> Sepolia </a>
              </template>
              <template v-slot:gnosis>
                <a :href="getEtherscanUrl(deployments.umbra, 100)" class="hyperlink" target="_blank"> Gnosis Chain </a>
              </template>
              <template v-slot:optimism>
                <a :href="getEtherscanUrl(deployments.umbra, 10)" class="hyperlink" target="_blank"> Optimism </a>
              </template>
              <template v-slot:polygon>
                <a :href="getEtherscanUrl(deployments.umbra, 137)" class="hyperlink" target="_blank"> Polygon </a>
              </template>
              <template v-slot:arbitrum>
                <a :href="getEtherscanUrl(deployments.umbra, 42161)" class="hyperlink" target="_blank"> Arbitrum </a>
              </template>
            </i18n-t>
            <i18n-t scope="global" keypath="FAQ.network-addrs-registry" tag="li">
              <template v-slot:stealthRegistry>
                <span class="code">StealthKeyRegistry</span>
              </template>
              <template v-slot:stealthRegistryAddr>
                <span class="code">{{ deployments.registry }}</span>
              </template>
              <template v-slot:mainnet>
                <a :href="getEtherscanUrl(deployments.registry, 1)" class="hyperlink" target="_blank"> mainnet </a>
              </template>
              <template v-slot:optimism>
                <a :href="getEtherscanUrl(deployments.registry, 10)" class="hyperlink" target="_blank"> Optimism </a>
              </template>
              <template v-slot:polygon>
                <a :href="getEtherscanUrl(deployments.registry, 137)" class="hyperlink" target="_blank"> Polygon </a>
              </template>
              <template v-slot:arbitrum>
                <a :href="getEtherscanUrl(deployments.registry, 42161)" class="hyperlink" target="_blank"> Arbitrum </a>
              </template>
              <template v-slot:sepolia>
                <a :href="getEtherscanUrl(deployments.registry, 11155111)" class="hyperlink" target="_blank">
                  Sepolia
                </a>
              </template>
              <template v-slot:gnosis>
                <a :href="getEtherscanUrl(deployments.registry, 100)" class="hyperlink" target="_blank">
                  Gnosis Chain
                </a>
              </template>
            </i18n-t>
          </ul>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-does-it-work-technical">
        <f-a-q-item :expanded="selectedId === 'how-does-it-work-technical'" :question="$t('FAQ.how-it-works')">
          <div v-html="$t('FAQ.how-it-works-answer')"></div>

          <i18n-t scope="global" keypath="FAQ.how-it-works-answer-ECDH" tag="p">
            <template v-slot:ECDH>
              <a
                class="hyperlink"
                href="https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman"
                target="_blank"
                >Elliptic Curve Diffie-Hellman</a
              >
            </template>
            <template v-slot:c>
              <span class="code">c</span>
            </template>
            <template v-slot:aStealth>
              <span class="code">a_stealth</span>
            </template>
            <template v-slot:announcement>
              <span class="code">Announcement</span>
            </template>
            <template v-slot:PEphemeral>
              <span class="code">P_ephemeral</span>
            </template>
          </i18n-t>

          <div v-html="$t('FAQ.how-it-works-answer-part-2')"></div>

          <i18n-t scope="global" keypath="FAQ.how-it-works-answer-option-3" tag="p">
            <template v-slot:loopring>
              <a class="hyperlink" href="https://loopring.org/" target="_blank">Loopring</a>
            </template>
            <template v-slot:zksync>
              <a class="hyperlink" href="https://zksync.io/" target="_blank">zkSync</a>
            </template>
          </i18n-t>

          <div v-html="$t('FAQ.how-it-works-answer-end')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-spending-and-viewing-keys">
        <f-a-q-item
          :expanded="selectedId === 'what-are-spending-and-viewing-keys'"
          :question="$t('FAQ.spend-view-keys')"
        >
          <i18n-t scope="global" keypath="FAQ.spend-view-keys-answer-1" tag="p">
            <a class="hyperlink" href="https://electriccoin.co/blog/explaining-viewing-keys/\" target="_blank">{{
              $t('FAQ.nomenclature')
            }}</a>
          </i18n-t>

          <i18n-t scope="global" keypath="FAQ.spend-view-keys-answer-2" tag="p">
            <span class="hyperlink" @click="expandAndScrollToElement('how-does-it-work-technical')">{{
              $t('FAQ.spend-view-keys-technical-details')
            }}</span>
          </i18n-t>
        </f-a-q-item>
      </div>

      <!-- Advanced Mode -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="advanced-mode"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.advanced-mode') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="what-is-advanced-mode">
        <f-a-q-item :expanded="selectedId === 'what-is-advanced-mode'" :question="$t('FAQ.what-is-advanced')">
          <div v-html="$t('FAQ.what-is-advanced-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-do-i-send-funds-to-a-user-by-their-address-or-public-key">
        <f-a-q-item
          :expanded="selectedId === 'how-do-i-send-funds-to-a-user-by-their-address-or-public-key'"
          :question="$t('FAQ.send-to-pkey')"
        >
          <div v-html="$t('FAQ.send-to-pkey-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-access-funds-sent-to-me-by-using-my-address-as-the-recipient-identifier">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-access-funds-sent-to-me-by-using-my-address-as-the-recipient-identifier'"
          :question="$t('FAQ.access-funds')"
        >
          <div v-html="$t('FAQ.access-funds-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-scan-just-certain-range-of-blocks">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-scan-just-certain-range-of-blocks'"
          :question="$t('FAQ.scan-range')"
        >
          <div v-html="$t('FAQ.scan-range-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-view-the-stealth-private-keys">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-view-the-stealth-private-keys'"
          :question="$t('FAQ.view-prvkey')"
        >
          <div v-html="$t('FAQ.view-prvkey-answer')"></div>
        </f-a-q-item>
      </div>

      <!-- For Developers -->
      <div class="separator q-mt-lg q-mb-xl"></div>
      <div
        @click="copyUrl"
        id="for-developers"
        isHeader="true"
        class="cursor-pointer link-icon-parent text-center text-primary text-h6 header-black q-pb-none"
      >
        {{ $t('FAQ.for-developers') }}
        <q-icon class="link-icon" name="fas fa-link" right />
      </div>

      <div @click="copyUrl" id="how-can-i-build-on-top-of-umbra">
        <f-a-q-item :expanded="selectedId === 'how-can-i-build-on-top-of-umbra'" :question="$t('FAQ.build-on-umbra')">
          <div v-html="$t('FAQ.build-on-umbra-answer', { link: 'https://tools.ietf.org/html/rfc6979' })"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="how-can-i-receive-a-users-viewing-key-but-not-their-spending-key">
        <f-a-q-item
          :expanded="selectedId === 'how-can-i-receive-a-users-viewing-key-but-not-their-spending-key'"
          :question="$t('FAQ.receive-vkey')"
        >
          <div v-html="$t('FAQ.receive-vkey-answer')"></div>
        </f-a-q-item>
      </div>

      <div @click="copyUrl" id="what-are-hooks-and-how-do-i-use-them">
        <f-a-q-item :expanded="selectedId === 'what-are-hooks-and-how-do-i-use-them'" :question="$t('FAQ.hooks')">
          <i18n-t scope="global" keypath="FAQ.hooks-answer" tag="p">
            <a class="hyperlink" href="https://eips.ethereum.org/EIPS/eip-777" target="_blank">ERC-777</a>
          </i18n-t>
          <div v-html="$t('FAQ.hooks-answer-rest')"></div>
          <i18n-t scope="global" keypath="FAQ.hooks-answer-encode-data" tag="p">
            <a
              class="hyperlink"
              href="https://docs.ethers.io/v5/single-page/#/v5/api/utils/abi/interface/-%23-Interface--encoding"
              target="_blank"
              >{{ $t('FAQ.hooks-answer-encoding-data') }}</a
            >
          </i18n-t>
          <div v-html="$t('FAQ.hooks-answer-end')"></div>
        </f-a-q-item>
      </div>
    </q-list>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
import FAQItem from 'components/FAQItem.vue';
import { copyToClipboard, scroll } from 'quasar';
import { notifyUser } from 'src/utils/alerts';
import { getEtherscanUrl } from 'src/utils/utils';

function useScrollToElement(route: RouteLocationNormalizedLoaded) {
  const { getScrollTarget, setVerticalScrollPosition } = scroll;
  const selectedId = ref('');

  const expandAndScrollToElement = (elementId: string) => {
    // Get element
    const el = document.getElementById(elementId);
    if (!el) return;
    selectedId.value = elementId;

    // Scroll to element target and offset with specified animation duration.
    setVerticalScrollPosition(getScrollTarget(el), el.offsetTop, 500);
  };

  // Copy the URL to go directly to the clicked element and update URL in navigation bar
  const copyUrl = async (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const page = `${route.path}#${el.id}`; // `route.path` includes the leading forward slash
    await copyToClipboard(`${window.location.origin}${page}`);
    if (el.getAttribute('isHeader')) notifyUser('success', 'URL successfully copied to clipboard');
    window.history.pushState('', '', page); // updates URL in navigation bar
  };

  // Scrolls to element, and when applicable clicks the expansion item to open it
  const elementId = route.hash.slice(1); // .slice(1) to remove '#'
  onMounted(() => expandAndScrollToElement(elementId));

  return { selectedId, expandAndScrollToElement, copyUrl };
}

export default defineComponent({
  name: 'PageFAQ',
  components: { FAQItem },
  setup() {
    const deployments = {
      umbra: '0xFb2dc580Eed955B528407b4d36FfaFe3da685401',
      registry: '0x31fe56609C65Cd0C510E7125f051D440424D38f3',
    };
    const route = useRoute();
    return { ...useScrollToElement(route), deployments, getEtherscanUrl };
  },
});
</script>

<style lang="sass" scoped>
.link-icon-parent:hover .link-icon
  color: $primary

.link-icon
  color: transparent
</style>
