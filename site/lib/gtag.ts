export const GTAG_ID = "AW-18511881919";

// Espaço Económico Europeu (UE + Islândia/Liechtenstein/Noruega) + Reino Unido + Suíça.
// A negação de consentimento por omissão só se aplica aqui — fora destas regiões,
// a medição fica ativa de imediato (RGPD não exige consentimento prévio nesses casos).
export const CONSENT_DEFAULT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO",
  "SK", "SI", "ES", "SE", "GB", "CH",
];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

type ConsentChoice = "accepted" | "rejected";

export function updateConsent(choice: ConsentChoice) {
  const granted = choice === "accepted";
  gtag("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
  });
}

export function reportLeadConversion() {
  gtag("event", "generate_lead");
}
