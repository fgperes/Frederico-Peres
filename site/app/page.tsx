import Link from "next/link";
import { ShieldCheck, MapPin, Headset, TrendingUp, ArrowRight, Mail, Phone } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TeamIllustration, LinkedRingsIllustration } from "@/components/illustrations";
import { ContactForm } from "@/components/contact-form";
import { ServicesTabs } from "@/components/services-tabs";
import { Reveal } from "@/components/reveal";

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    description: "geral@people4people.pt",
  },
  {
    icon: Phone,
    title: "Telefone",
    description: "+351 962 995 102",
  },
];

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
        <Reveal>
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
        </Reveal>
        <Reveal delay={150} className="justify-self-center lg:justify-self-end">
          <TeamIllustration className="w-full max-w-md" />
        </Reveal>
      </div>
    </section>
  );
}

function Sobre() {
  return (
    <section id="sobre" className="border-t border-stone-200 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <LinkedRingsIllustration className="w-full max-w-md" />
        </Reveal>
        <Reveal delay={150}>
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
        </Reveal>
      </div>
    </section>
  );
}

function Modulos() {
  return (
    <section id="modulos" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Serviços</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Os módulos do SGRH
          </p>
        </Reveal>
        <Reveal delay={100} className="mt-14">
          <ServicesTabs />
        </Reveal>
      </div>
    </section>
  );
}

function Porque() {
  return (
    <section className="border-t border-stone-200 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Porquê people4people</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Feito para a realidade portuguesa
          </p>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 100} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/10 text-violet-700">
                <Icon size={22} strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Por usar na home até termos logótipos reais de parceiros — ver <Parcerias /> em Home().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Parcerias() {
  return (
    <section className="border-t border-stone-200 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Parcerias</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Empresas e entidades que confiam na people4people
          </p>
        </Reveal>
        <Reveal
          delay={100}
          className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-20 items-center justify-center rounded-xl border border-dashed border-stone-300 text-xs font-medium text-stone-400"
            >
              Logótipo
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function Contacto() {
  return (
    <section id="contacto" className="py-20 sm:py-28">
      <Reveal className="mx-auto max-w-5xl rounded-3xl bg-violet-900 px-8 py-16 sm:px-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Vamos simplificar a gestão de pessoas da sua empresa.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-100">
            Preencha os seus dados e a nossa equipa entra em contacto para marcar uma demonstração.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <ContactForm />
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              Outras formas de contacto
            </h3>
            {CONTACT_CHANNELS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl bg-white/10 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-violet-100">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
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
      {/* <Parcerias /> — voltar a mostrar quando houver logótipos reais de parceiros */}
      <Contacto />
      <Footer />
    </main>
  );
}
