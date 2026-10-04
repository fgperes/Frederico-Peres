import Link from "next/link";
import { ShieldCheck, MapPin, Headset, TrendingUp, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TeamIllustration, LinkedRingsIllustration } from "@/components/illustrations";
import { ContactForm } from "@/components/contact-form";
import { ServicesTabs } from "@/components/services-tabs";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Pensado para Portugal",
    description: "Construído de raiz à volta do Código do Trabalho português, não adaptado de outro mercado.",
  },
  {
    icon: MapPin,
    title: "Tudo numa só plataforma",
    description: "Acaba com as dezenas de ficheiros Excel dispersos entre departamentos e pessoas.",
  },
  {
    icon: Headset,
    title: "Suporte em português",
    description: "Por uma equipa que percebe a realidade do dia a dia das PME portuguesas.",
  },
  {
    icon: TrendingUp,
    title: "Pronto a crescer",
    description: "Dos primeiros colaboradores a centenas, sem perder controlo nem clareza.",
  },
];

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-block rounded-full bg-violet-600/10 px-3 py-1 text-xs font-medium text-violet-700">
            Software de Gestão de Recursos Humanos
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Menos processos,
            <br />
            mais pessoas.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
            A people4people simplifica a gestão de recursos humanos das empresas portuguesas —
            colaboradores, horários, ausências, contratos e processamento salarial, tudo numa só
            plataforma.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Pedir uma demonstração
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <TeamIllustration className="w-full max-w-md justify-self-center lg:justify-self-end" />
      </div>
    </section>
  );
}

function Sobre() {
  return (
    <section id="sobre" className="border-t border-stone-200 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <LinkedRingsIllustration className="w-full max-w-md" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Quem somos</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Acabámos com as folhas de cálculo dispersas na gestão de pessoas.
          </p>
          <p className="mt-6 text-base leading-relaxed text-stone-600">
            A people4people nasceu para dar resposta a um problema comum a praticamente todas as
            empresas portuguesas: a gestão de recursos humanos espalhada por dezenas de ficheiros,
            emails e processos manuais. Criámos o <strong className="text-stone-900">SGRH</strong>,
            uma plataforma pensada de raiz para a realidade das empresas portuguesas e para o
            Código do Trabalho, que junta num só sítio tudo o que é preciso para gerir pessoas —
            da entrada ao recibo de vencimento.
          </p>
          <Link
            href="/sobre"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800"
          >
            Conhecer a nossa história
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Modulos() {
  return (
    <section id="modulos" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Serviços</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Os módulos do SGRH
          </p>
        </div>
        <div className="mt-14">
          <ServicesTabs />
        </div>
      </div>
    </section>
  );
}

function Porque() {
  return (
    <section className="border-t border-stone-200 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Porquê people4people</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Feito para a realidade portuguesa
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/10 text-violet-700">
                <Icon size={22} strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contacto() {
  return (
    <section id="contacto" className="py-20 sm:py-28">
      <div className="mx-auto max-w-2xl rounded-3xl bg-violet-900 px-8 py-16 text-center sm:px-16">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Vamos simplificar a gestão de pessoas da sua empresa.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-100">
          Preencha os seus dados e a nossa equipa entra em contacto para marcar uma demonstração.
        </p>
        <ContactForm />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Sobre />
      <Modulos />
      <Porque />
      <Contacto />
      <Footer />
    </main>
  );
}
