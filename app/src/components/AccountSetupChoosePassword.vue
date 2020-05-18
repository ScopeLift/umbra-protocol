<template>
  <div>
    To maximize privacy and security, we'll generate a random private key that
    will be used to manage your Umbra account. This key will be encrypted based
    on your chosen password.

    <div
      class="q-mt-lg"
      style="max-width: 350px"
    >
      <base-input
        v-model="password1"
        label="Enter Password"
        :rules="isValidPassword1"
        type="password"
      />
      <base-input
        v-model="password2"
        label="Confirm Password"
        :lazy-rules="false"
        :rules="isValidPassword2"
        type="password"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'AccountSetupChoosePassword',

  data() {
    return {
      password1: undefined,
      password2: undefined,
    };
  },

  methods: {
    isValidPassword1() {
      if (!this.password1) return 'Please enter a password';
      return this.password1.length > 7 || 'Password must be at least 8 characters';
    },
    isValidPassword2() {
      if (!this.password2) return 'Passwords do not match';
      const isValid = this.password1 === this.password2;
      // NOTE: Mutation performed here
      if (isValid) this.$store.commit('user/setPassword', this.password1);
      return isValid || 'Passwords do not match';
    },
  },
};
</script>
