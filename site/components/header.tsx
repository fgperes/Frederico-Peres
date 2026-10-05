import Link from "next/link";
import { Logo } from "./logo";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#faf9f7]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 sm:flex">
          <Link href="/sobre" className="hover:text-stone-900">Sobre Nós</Link>
          <Link href="/#modulos" className="hover:text-stone-900">Os Nossos Serviços</Link>
          <Link href="/#contacto" className="hover:text-stone-900">Contacto</Link>
        </nav>
        <Link
          href="/#contacto"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
        >
          Pedir uma demonstração
        </Link>
      </div>
    </header>
  );
}
