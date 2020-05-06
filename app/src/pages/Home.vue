<template>
  <q-page padding>
    <h2 class="text-center text-bold">
      Send Stealth Payments
    </h2>

    <div class="row justify-center">
      <q-card class="col-auto card">
        <q-card-section class="card-header">
          Send
        </q-card-section>
      </q-card>
      <q-card class="col-auto card">
        <q-card-section class="card-header">
          Receive
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
export default {
  name: 'Home',
};
</script>

<style>
.card {
  margin: 1rem;
  max-width: 200px;
  min-width: 150px !important;
  padding: 1rem;
}

.card-header {
  text-align: center;
}
</style>
