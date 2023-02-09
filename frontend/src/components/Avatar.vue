<template>
  <span id="avatar-container" class="row">
    <Jazzicon :address="address" />
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType, watch } from 'vue';
import Jazzicon from 'src/components/Jazzicon.vue';

export default defineComponent({
  name: 'AvatarComponent',
  components: { Jazzicon },
  props: {
    avatar: {
      type: null as unknown as PropType<string | null>,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
  },
  setup: (props) => {
    // We don't have an avatar when the component is first mounted, so we display the jazzicon,
    // watch the avatar prop for changes, and replace the jazzicon if/when we get an avatar.
    watch(
      () => props.avatar,
      (newAvatar) => {
        if (newAvatar) {
          const avatarImg = new Image();
          avatarImg.onload = () => {
            document.querySelector('#jazzicon')?.remove();
            document.querySelector('#avatar-container')?.appendChild(avatarImg);
          };
          avatarImg.id = 'avatar';
          avatarImg.width = 20;
          avatarImg.src = newAvatar;
        }
      }
    );
  },
});
</script>

<style lang="sass">
#avatar
  border-radius: 50%
</style>
