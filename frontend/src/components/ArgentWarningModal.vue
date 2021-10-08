<template>
  <q-card class="border-top-thick">
    <q-card-section class="row justify-end q-my-none q-py-none">
      <q-btn class="text-caption text-muted" icon="fas fa-times" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />Warning: Argent Compatibility Issues
      </h5>
    </q-card-section>

    <q-card-section>
      <p class="text-bold">
        Umbra is not compatible with Argent's standard security model. While you can still use Umbra with Argent, you
        are at risk of losing funds if you switch devices or have to rely on social recovery without first withdrawing
        any funds sent to you via Umbra.
      </p>
      <p>
        Umbra works by generating app-specific keys derived from your wallet's private key. Argent is unique in that its
        security does not rely on your private key. This is good in many ways.
      </p>
      <p>When using Umbra, however, you must be aware of the following:</p>
      <ol>
        <li>
          If you recover your Argent wallet onto a new device, the new wallet will have the same address but a different
          private key. Unless you have access to the old device, funds sent via Umbra that you have not withdrawn will
          become unrecoverable.
        </li>
        <br />
        <li>
          As a result, when you get a new device, you should withdraw all funds first using your old device, then repeat
          the Umbra account setup and re-publish your keys. Soon, the app will attempt to detect when you need to do
          this to minimize the chance of lost funds, but for now you must do it manually.
        </li>
        <br />
        <li>
          Unlike other applications, the security of funds received by Umbra is not protected by the standard Argent
          security model, and instead they are just protected by your private key.
        </li>
      </ol>
    </q-card-section>

    <q-card-section>
      <div class="row justify-evenly">
        <base-button label="I acknowledge the risks" @click="context.emit('acknowledged')" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'ArgentWarningModal',
  setup(_props, context) {
    return { context };
  },
});
</script>
