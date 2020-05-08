<template>
  <q-page padding>
    <h3 class="page-title">
      Receive
    </h3>

    <!-- Send -->
    <div class="row justify-center">
      <q-card
        class="col-auto card-border action-card"
        @click="$router.push({name: 'setup'})"
      >
        <q-card-section class="text-h6 header-black card-header">
          Account Setup
        </q-card-section>
      </q-card>

      <!-- Receive -->
      <q-card
        class="col-auto card-border action-card"
        @click="$router.push({name: 'withdraw'})"
      >
        <q-card-section class="text-h6 header-black card-header">
          Withdraw Funds
        </q-card-section>
      </q-card>
    </div>

    <div class="form">
      <!-- TODO -->
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'Receive',
};
</script>
