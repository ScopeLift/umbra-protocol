<template>
  <div ref="containerRef" class="q-my-sm" />
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import useSettingsStore from 'src/store/settings';
import { TURNSTILE_SITE_KEY } from 'src/utils/constants';

// Cloudflare requires api.js to be loaded from this exact URL. Proxying or bundling it breaks future updates.
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileRenderOptions = {
  sitekey: string;
  theme: 'light' | 'dark';
  language: string;
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

type Turnstile = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

let turnstilePromise: Promise<Turnstile> | undefined;

const loadTurnstile = () => {
  turnstilePromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.onload = () => {
      const { turnstile } = window as unknown as { turnstile?: Turnstile };
      if (turnstile) resolve(turnstile);
      else reject(new Error('Turnstile did not initialize'));
    };
    script.onerror = () => {
      // Allow a later mount to try loading the script again.
      script.remove();
      turnstilePromise = undefined;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return turnstilePromise;
};

export default defineComponent({
  name: 'TurnstileWidget',

  emits: ['verify', 'expire', 'error'],

  setup(_props, { emit }) {
    const { isDark, language } = useSettingsStore();
    const containerRef = ref<HTMLElement>();
    let turnstile: Turnstile | undefined;
    let widgetId: string | undefined;
    let isUnmounted = false;

    function removeWidget() {
      if (turnstile && widgetId) turnstile.remove(widgetId);
      widgetId = undefined;
    }

    function renderWidget() {
      if (!turnstile || !containerRef.value || isUnmounted) return;

      // Re-rendering discards any token the previous widget issued.
      removeWidget();
      emit('expire');

      try {
        widgetId = turnstile.render(containerRef.value, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: isDark.value ? 'dark' : 'light',
          language: language.value.value || 'auto',
          size: 'flexible',
          callback: (token) => emit('verify', token),
          'expired-callback': () => emit('expire'),
          'error-callback': () => emit('error'),
        });
      } catch {
        emit('error');
      }
    }

    // Turnstile tokens can only be verified once, so the parent resets the widget after each submission attempt.
    function reset() {
      if (turnstile && widgetId) turnstile.reset(widgetId);
    }

    onMounted(async () => {
      try {
        turnstile = await loadTurnstile();
      } catch {
        emit('error');
        return;
      }
      renderWidget();
    });

    onBeforeUnmount(() => {
      isUnmounted = true;
      removeWidget();
    });

    // The widget's theme and language are fixed when it renders, so render it again when either changes.
    watch([isDark, () => language.value.value], renderWidget);

    return { containerRef, reset };
  },
});
</script>
