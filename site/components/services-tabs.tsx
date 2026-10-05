"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  CalendarClock,
  Fingerprint,
  CalendarCheck,
  FileSignature,
  Banknote,
  LineChart,
  Check,
} from "lucide-react";
import { ColaboradoresDemo } from "./colaboradores-demo";
import { HorariosDemo } from "./horarios-demo";
import { PreditivoDemo } from "./preditivo-demo";
import { PicagensDemo } from "./picagens-demo";
import { AbsenceCalendarDemo } from "./absence-calendar-demo";
import { ContratosDemo } from "./contratos-demo";
import { PayrollDemo } from "./payroll-demo";

const PREVIEW_COMPONENTS: Record<string, ComponentType> = {
  colaboradores: ColaboradoresDemo,
  horarios: HorariosDemo,
  preditivo: PreditivoDemo,
  picagens: PicagensDemo,
  ausencias: AbsenceCalendarDemo,
  contratos: ContratosDemo,
  payroll: PayrollDemo,
};

type Service = {
  key: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  bullets: string[];
};

const SERVICES: Service[] = [
  {
    key: "colaboradores",
    icon: Users,
    label: "Colaboradores",
    title: "Gestão de Colaboradores",
    description:
      "Fichas completas, estrutura organizacional, departamentos, equipas e locais de trabalho — tudo num só sítio.",
    bullets: [
      "Ficha completa por colaborador (dados pessoais, contratuais, documentos)",
      "Departamentos e equipas sempre organizados",
      "Organograma e locais de trabalho atualizados",
    ],
  },
  {
    key: "horarios",
    icon: CalendarClock,
    label: "Horários",
    title: "Horários e Escalas",
    description:
      "Horário manual, por ciclos rotativos ou com previsão automática de necessidades, sempre dentro da lei.",
    bullets: [
      "Horário manual, por ciclos ou previsão automática",
      "Deteção de conflitos e descanso mínimo legal",
      "Publicação e partilha instantânea com a equipa",
    ],
  },
  {
    key: "preditivo",
    icon: LineChart,
    label: "Previsão",
    title: "Horário Preditivo",
    description:
      "Antecipa as necessidades de pessoal com base no histórico, antes de a procura acontecer — propostas de escala em rascunho, prontas para revisão.",
    bullets: [
      "Modelo estatístico baseado no histórico de procura (médias móveis)",
      "Propostas em rascunho — nunca publicadas sem revisão humana",
      "Ajuda a antecipar picos e a evitar falhas de cobertura",
    ],
  },
  {
    key: "picagens",
    icon: Fingerprint,
    label: "Picagens",
    title: "Picagens",
    description:
      "Registo de entradas e saídas com deteção automática de desvios e fluxo de justificação integrado.",
    bullets: [
      "Registo de entradas e saídas em qualquer dispositivo",
      "Deteção automática de atrasos e saídas antecipadas",
      "Fluxo de justificação e aprovação integrado",
    ],
  },
  {
    key: "ausencias",
    icon: CalendarCheck,
    label: "Ausências",
    title: "Ausências e Férias",
    description:
      "Pedidos, aprovações e saldos sempre atualizados — sem mais contas feitas à mão em folhas de cálculo.",
    bullets: [
      "Pedido e aprovação de férias em poucos cliques",
      "Saldos sempre atualizados, sem contas à mão",
      "Calendário de equipa, sem sobreposições",
    ],
  },
  {
    key: "contratos",
    icon: FileSignature,
    label: "Contratos",
    title: "Contratos de Trabalho",
    description:
      "Perfis de contrato, histórico completo por colaborador e alertas de prazos (período experimental, termo).",
    bullets: [
      "Perfis de contrato reutilizáveis e histórico completo",
      "Alertas de prazos (período experimental, termo)",
      "Conforme o Código do Trabalho português",
    ],
  },
  {
    key: "payroll",
    icon: Banknote,
    label: "Payroll",
    title: "Processamento Salarial",
    description:
      "Recibos de vencimento calculados automaticamente, com tabelas de IRS e pressupostos sempre atualizáveis.",
    bullets: [
      "Recibos de vencimento calculados automaticamente",
      "Tabelas de IRS e pressupostos sempre atualizáveis",
      "Histórico e exportação de todos os recibos",
    ],
  },
];

export function ServicesTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = SERVICES[activeIndex];

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Serviços do SGRH">
        {SERVICES.map((service, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={service.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(i)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
              }`}
            >
              <service.icon size={16} strokeWidth={2} />
              {service.label}
            </button>
          );
        })}
      </div>

      <div
        key={active.key}
        className="mt-10 grid grid-cols-1 items-center gap-10 rounded-3xl border border-stone-200 bg-white p-8 service-panel-enter sm:p-10 lg:grid-cols-[1fr_1fr]"
      >
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-stone-900">{active.title}</h3>
          <p className="mt-3 text-base leading-relaxed text-stone-600">{active.description}</p>
          <ul className="mt-6 space-y-3">
            {active.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-stone-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-violet-700">
                  <Check size={13} strokeWidth={2.5} />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <Preview active={active} />
      </div>
    </div>
  );
}

function Preview({ active }: { active: Service }) {
  const Component = PREVIEW_COMPONENTS[active.key];
  return <Component />;
}
