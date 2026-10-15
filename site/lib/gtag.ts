export const GTAG_ID = "AW-18511881919";

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
