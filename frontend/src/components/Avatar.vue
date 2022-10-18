<template>
  <span id="avatar-container" class="row">
    <Jazzicon :address="address" />
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs } from 'vue';
import Jazzicon from 'src/components/Jazzicon.vue';

export default defineComponent({
  name: 'Avatar',
  components: { Jazzicon },
  props: {
    avatar: {
      type: (null as unknown) as PropType<string | null>,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
  },
  setup: props => {
    if (props.avatar) {
      // load the avatar image async and display the jazzicon while waiting
      const avatarImg = new Image();
      avatarImg.onload = () => {
        document.querySelector('#jazzicon')?.remove();
        document.querySelector('#avatar-container')?.appendChild(avatarImg);
      };
      avatarImg.id = 'avatar';
      avatarImg.width = 20;
      avatarImg.src = toRefs(props).avatar;
    }
  },
});
</script>

<style lang="sass">
#avatar
  border-radius: 50%
</style>
