// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

// For the @metamask/jazzicon package
declare module '@metamask/jazzicon' {
  export default function (diameter: number, seed: number): HTMLElement;
}

// For the unicode-confusables package
declare module 'unicode-confusables' {
  export function isConfusing(input: string): boolean;
}
