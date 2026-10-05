import Link from "next/link";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { LogoMark } from "./logo";
import { TikTokIcon } from "./tiktok-icon";

const SOCIAL_LINKS = [
  { icon: Facebook, label: "Facebook", href: "https://www.facebook.com/people4people" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/people4people" },
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/company/people4people" },
  { icon: TikTokIcon, label: "TikTok", href: "https://www.tiktok.com/@people4people" },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-6 text-violet-600" />
              <span className="text-sm font-bold tracking-tight text-stone-900">
                people<span className="text-violet-600">4</span>people
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-500">
              Menos processos, mais pessoas. Software de gestão de recursos humanos para
              empresas portuguesas.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-violet-300 hover:text-violet-700"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Empresa</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li><Link href="/sobre" className="hover:text-stone-900">Sobre nós</Link></li>
              <li><Link href="/#modulos" className="hover:text-stone-900">Os Nossos Serviços</Link></li>
              <li><Link href="/#contacto" className="hover:text-stone-900">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li><Link href="/privacidade" className="hover:text-stone-900">Política de Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-stone-900">Termos de Utilização</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-500">
          © {new Date().getFullYear()} people4people — Menos processos, mais pessoas.
        </div>
      </div>
    </footer>
  );
}
