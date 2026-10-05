import Link from "next/link";
import { ShieldCheck, Layers, Headset, Sparkles, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TeamIllustration } from "@/components/illustrations";
import { Reveal } from "@/components/reveal";

const PRINCIPIOS = [
  {
    icon: Sparkles,
    title: "Simplicidade",
    description:
      "Cada ecrã existe para poupar tempo a quem gere pessoas — não para mostrar tudo o que a plataforma sabe fazer.",
  },
  {
    icon: ShieldCheck,
    title: "Rigor",
    description:
      "O Código do Trabalho português não é uma referência de rodapé — está nas regras de validação da própria aplicação.",
  },
  {
    icon: Headset,
    title: "Proximidade",
    description:
      "Falamos a mesma língua das equipas de RH que usam o SGRH todos os dias — literal e figuradamente.",
  },
  {
    icon: Layers,
    title: "Evolução contínua",
    description:
      "O SGRH cresce com o feedback de quem o usa — cada módulo nasceu de um problema real de gestão de pessoas.",
  },
];

export default function Sobre() {
  return (
    <main>
      <Header />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <span className="inline-block rounded-full bg-violet-600/10 px-3 py-1 text-xs font-medium text-violet-700">
              Sobre nós
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Uma equipa portuguesa, a resolver um problema português.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
              A people4people existe porque a gestão de recursos humanos na maioria das empresas
              portuguesas ainda vive espalhada por ficheiros Excel, emails e papel — mesmo em
              empresas que já digitalizaram praticamente tudo o resto.
            </p>
          </Reveal>
          <Reveal delay={150} className="justify-self-center lg:justify-self-end">
            <TeamIllustration className="w-full max-w-md" />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white py-20 sm:py-28">
        <Reveal className="mx-auto max-w-3xl px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">A nossa missão</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Dar às equipas de RH o tempo que os processos manuais lhes tiram.
          </p>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-stone-600">
            <p>
              Quem trabalha em Recursos Humanos passa grande parte do dia a reconciliar
              informação: um Excel de férias, outro de horários, uma pasta de contratos em PDF, um
              email de aprovação perdido numa caixa de entrada. Cada reconciliação é tempo que não
              foi gasto com pessoas — que é, no fundo, a razão de ser do próprio departamento.
            </p>
            <p>
              Construímos o <strong className="text-stone-900">SGRH</strong> a pensar exatamente
              nesse problema: uma plataforma única, pensada de raiz para a legislação laboral
              portuguesa, onde a gestão de colaboradores, horários, picagens, ausências, contratos
              e processamento salarial deixam de ser ficheiros separados e passam a ser uma só
              fonte de verdade.
            </p>
            <p>
              Não tentámos adaptar um produto genérico ao mercado português — começámos pelo
              Código do Trabalho e construímos a aplicação à volta dele.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Como trabalhamos</h2>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Os princípios por trás de cada funcionalidade
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {PRINCIPIOS.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 100} className="rounded-2xl border border-stone-200 bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white py-20 sm:py-28">
        <Reveal className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Quer conhecer o SGRH por dentro?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600">
            Veja os nossos serviços em detalhe ou peça uma demonstração à nossa equipa.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/#modulos"
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Ver os serviços
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/#contacto"
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Pedir uma demonstração
            </Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
