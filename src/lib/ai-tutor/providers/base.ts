/**
 * Provider abstraction — application code must not depend on a specific vendor.
 */

export type {
  TutorProvider,
  ProviderGenerateOptions,
  ProviderGenerateResult,
  ProviderMessage,
} from "../types";

import type { TutorProvider } from "../types";

let activeProvider: TutorProvider | null = null;

export function setTutorProvider(provider: TutorProvider): void {
  activeProvider = provider;
}

export function getTutorProvider(): TutorProvider {
  if (!activeProvider) {
    throw new Error(
      "No AI tutor provider configured. Call setTutorProvider() or use createDefaultProvider()."
    );
  }
  return activeProvider;
}
