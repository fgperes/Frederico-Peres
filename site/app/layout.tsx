import type { Metadata } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { FloatingChatWidget } from "@/components/floating-chat-widget";

export const metadata: Metadata = {
  metadataBase: new URL("https://people4people.pt"),
  title: "people4people — Menos processos, mais pessoas",
  description:
    "A people4people simplifica a gestão de recursos humanos das empresas portuguesas: colaboradores, horários, ausências, contratos e processamento salarial, tudo numa só plataforma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="antialiased">
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        {children}
        <CookieConsent />
        <FloatingChatWidget />
      </body>
    </html>
  );
}
