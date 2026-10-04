import Link from "next/link";
import { LogoMark } from "./logo";

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
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Empresa</h3>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li><Link href="/sobre" className="hover:text-stone-900">Sobre nós</Link></li>
              <li><Link href="/#modulos" className="hover:text-stone-900">Serviços</Link></li>
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
