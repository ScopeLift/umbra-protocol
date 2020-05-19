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
        <li>Choose a MetaMask account to associate with Umbra</li>
        <li>
          Click Account Setup and follow the setup wizard (this is optional,
          but recommended for additional security and privacy)
        </li>
        <li>
          To receive funds any one of the following identifiers:
          <ul>
            <li>Your configured ENS domain (recommended)</li>
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
