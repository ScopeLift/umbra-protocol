<template>
  <div>
    <h3 class="page-title">
      Tutorial
    </h3>

    <div
      class="text-left"
      style="max-width: 800px; margin: 0 auto; padding: 1rem;"
    >
      <!-- To Receive Funds -->
      <h5>
        To Receive Funds
      </h5>
      <ol>
        <li>Create a new account with MetaMask</li>
        <li>
          Using that account, purchase and configure an ENS domain on Ropsten
          (this is optional, but recommended for additional privacy)
          <ol>
            <li>
              See
              <a
                href="https://docs.ethhub.io/guides/guide-to-ens/"
                target="_blank"
                class="hyperlink"
              >this guide</a>
              for instructions on purchasing and configuring your ENS domain
            </li>
            <li> Make sure to set the resolver to the Public Resolver </li>
            <li> Make sure to set the reverse record </li>
          </ol>
        </li>
        <li>Login to the Umbra app with that account</li>
        <li>
          If using ENS, navigate to the ENS Setup page and follow the steps.
          Once you see green checkmarks in both steps, ENS setup is complete.
        </li>
        <li>
          To receive funds, give the recipient any one of the following identifiers:
          <ul>
            <li>Your configured ENS domain</li>
            <li>Your public Ethereum address</li>
            <li>A transaction hash from a transaction you sent</li>
            <li>Your full public key</li>
          </ul>
        </li>
        <li>
          Once someone has sent you a stealth payment, navigate to the Withdraw
          page to retreive it
        </li>
      </ol>
      <!-- To Send Funds -->
      <h5 class="q-mt-xl">
        To Send Funds
      </h5>
      <ol>
        <li>Ask the recipient for their preferred identifier </li>
        <li>Login to Umbra with the account you'd like to send funds from</li>
        <li>Navigate to the Send page and follow the prompts</li>
      </ol>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TheTutorial',
  data() {
    return {};
  },
};
</script>
