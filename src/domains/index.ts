export * from './domain-config';
export * from './outdoor-domain';

import { DomainConfig, GENERIC_DOMAIN, ECOMMERCE_DOMAIN, SAAS_DOMAIN } from './domain-config';
import { OUTDOOR_DOMAIN } from './outdoor-domain';

// Domain registry
export const DOMAINS: Record<string, DomainConfig> = {
  generic: GENERIC_DOMAIN,
  outdoor: OUTDOOR_DOMAIN,
  ecommerce: ECOMMERCE_DOMAIN,
  saas: SAAS_DOMAIN,
};

// Get domain configuration by name
export function getDomainConfig(domainName?: string): DomainConfig {
  if (!domainName || !DOMAINS[domainName]) {
    return GENERIC_DOMAIN;
  }
  return DOMAINS[domainName];
}

// List available domains
export function listAvailableDomains(): string[] {
  return Object.keys(DOMAINS);
}