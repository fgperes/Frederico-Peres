import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
