<template>
  <q-page padding>
    <h3 class="page-title">
      Send
    </h3>

    <div class="form">
      <lookup-recipient />
    </div>
  </q-page>
</template>

<script>
import LookupRecipient from 'components/LookupRecipient';

export default {
  name: 'Send',

  components: {
    LookupRecipient,
  },
};
</script>
