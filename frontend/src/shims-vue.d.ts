// Types Vue single-file component imports.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

// For the @metamask/jazzicon package
declare module '@metamask/jazzicon' {
  export default function (diameter: number, seed: number): HTMLElement;
}

// For the unicode-confusables package
declare module 'unicode-confusables' {
  export function isConfusing(input: string): boolean;
}
