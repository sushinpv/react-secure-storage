// Cypress exposes a global `Cypress` object when tests run inside it; the library reads env values from it.
declare const Cypress: { env(key: string): string | undefined };
