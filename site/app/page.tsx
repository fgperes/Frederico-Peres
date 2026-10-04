import Link from "next/link";
import {
  Users,
  CalendarClock,
  Fingerprint,
  CalendarCheck,
  FileSignature,
  Banknote,
  ShieldCheck,
  MapPin,
  Headset,
  TrendingUp,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TeamIllustration, LinkedRingsIllustration } from "@/components/illustrations";

const SGRH_URL = "https://sgrh.people4people.pt";
const CONTACT_EMAIL = "geral@people4people.pt";

const MODULES = [
  {
    icon: Users,
    title: "Gestão de Colaboradores",
    description:
      "Fichas completas, estrutura organizacional, departamentos, equipas e locais de trabalho — tudo num só sítio.",
  },
  {
    icon: CalendarClock,
    title: "Horários e Escalas",
    description:
      "Horário manual, por ciclos rotativos ou com previsão automática de necessidades, sempre dentro da lei.",
  },
  {
    icon: Fingerprint,
    title: "Picagens",
    description:
      "Registo de entradas e saídas com deteção automática de desvios e fluxo de justificação integrado.",
  },
  {
    icon: CalendarCheck,
    title: "Ausências e Férias",
    description:
      "Pedidos, aprovações e saldos sempre atualizados — sem mais contas feitas à mão em folhas de cálculo.",
  },
  {
    icon: FileSignature,
    title: "Contratos de Trabalho",
    description:
      "Perfis de contrato, histórico completo por colaborador e alertas de prazos (período experimental, termo).",
  },
  {
    icon: Banknote,
    title: "Processamento Salarial",
    description:
      "Recibos de vencimento calculados automaticamente, com tabelas de IRS e pressupostos sempre atualizáveis.",
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
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Pedido de demonstração — SGRH")}`}
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Pedir uma demonstração
              <ArrowRight size={16} />
            </a>
            <Link
              href={SGRH_URL}
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Aceder ao SGRH
            </Link>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">O produto</h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Os módulos do SGRH
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_3px_rgba(28,25,23,0.06)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700">
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
            </div>
          ))}
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
      <div className="mx-auto max-w-3xl rounded-3xl bg-violet-900 px-8 py-16 text-center sm:px-16">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Vamos simplificar a gestão de pessoas da sua empresa.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-100">
          Fale connosco para conhecer o SGRH e perceber como pode encaixar na sua empresa.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-violet-900 shadow-sm hover:bg-violet-50"
        >
          <Mail size={16} />
          {CONTACT_EMAIL}
        </a>
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
