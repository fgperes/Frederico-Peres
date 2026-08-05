"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Info } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/evaluations";
import { createTemplate, updateTemplate, type TemplatePayload } from "./actions";

type OptionState = { key: string; label: string; points: number };

type QuestionState = {
  key: string;
  sectionKey: string;
  text: string;
  type: QuestionType;
  maxScore: number;
  scaleMin: number;
  scaleMax: number;
  options: OptionState[];
};

type SectionState = { key: string; title: string };

type RuleState = { key: string; minPercent: number; consequence: string };

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `k${keySeq}`;
}

function emptySection(title = ""): SectionState {
  return { key: nextKey(), title };
}

function emptyQuestion(sectionKey: string): QuestionState {
  return { key: nextKey(), sectionKey, text: "", type: "SCALE", maxScore: 0, scaleMin: 1, scaleMax: 5, options: [] };
}

function emptyOption(): OptionState {
  return { key: nextKey(), label: "", points: 0 };
}

function emptyRule(): RuleState {
  return { key: nextKey(), minPercent: 0, consequence: "" };
}

export function TemplateForm({
  teams,
  employees,
  initial,
}: {
  teams: { id: string; name: string; departmentName: string }[];
  employees: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    hasSelfEvaluation: boolean;
    sections: SectionState[];
    questions: QuestionState[];
    consequenceRules: RuleState[];
    teamIds: string[];
    employeeIds: string[];
    isUsed: boolean;
  };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [hasSelfEvaluation, setHasSelfEvaluation] = useState(initial?.hasSelfEvaluation ?? false);
  const defaultSections = initial?.sections ?? [emptySection("Secção 1")];
  const [sections, setSections] = useState<SectionState[]>(defaultSections);
  const [questions, setQuestions] = useState<QuestionState[]>(
    initial?.questions ?? [emptyQuestion(defaultSections[0].key)]
  );
  const [rules, setRules] = useState<RuleState[]>(initial?.consequenceRules ?? []);
  const [teamIds, setTeamIds] = useState<string[]>(initial?.teamIds ?? []);
  const [employeeIds, setEmployeeIds] = useState<string[]>(initial?.employeeIds ?? []);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [dragSectionKey, setDragSectionKey] = useState<string | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);
  const [dragQuestionKey, setDragQuestionKey] = useState<string | null>(null);
  const [dragOverQuestionKey, setDragOverQuestionKey] = useState<string | null>(null);

  const isUsed = initial?.isUsed ?? false;

  const total = useMemo(
    () =>
      questions
        .filter((q) => q.type !== "TEXT")
        .reduce((sum, q) => sum + (Number.isFinite(q.maxScore) ? q.maxScore : 0), 0),
    [questions]
  );
  const totalOk = total === 100;

  // --- Secções ---

  function addSection() {
    setSections((ss) => [...ss, emptySection(`Secção ${ss.length + 1}`)]);
  }

  function updateSectionTitle(key: string, title: string) {
    setSections((ss) => ss.map((s) => (s.key === key ? { ...s, title } : s)));
  }

  function removeSection(key: string) {
    if (questions.some((q) => q.sectionKey === key)) {
      alert("Esta secção tem perguntas. Mova-as ou elimine-as primeiro.");
      return;
    }
    setSections((ss) => ss.filter((s) => s.key !== key));
  }

  function handleSectionDrop(targetKey: string) {
    if (!dragSectionKey || dragSectionKey === targetKey) {
      setDragSectionKey(null);
      setDragOverSectionKey(null);
      return;
    }
    setSections((ss) => {
      const dragIdx = ss.findIndex((s) => s.key === dragSectionKey);
      const targetIdx = ss.findIndex((s) => s.key === targetKey);
      if (dragIdx === -1 || targetIdx === -1) return ss;
      const next = [...ss];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragSectionKey(null);
    setDragOverSectionKey(null);
  }

  // --- Perguntas ---

  function updateQuestion(key: string, patch: Partial<QuestionState>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function addQuestion(sectionKey: string) {
    setQuestions((qs) => [...qs, emptyQuestion(sectionKey)]);
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }

  function addOption(questionKey: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === questionKey ? { ...q, options: [...q.options, emptyOption()] } : q))
    );
  }

  function updateOption(questionKey: string, optionKey: string, patch: Partial<{ label: string; points: number }>) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === questionKey
          ? { ...q, options: q.options.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)) }
          : q
      )
    );
  }

  function removeOption(questionKey: string, optionKey: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === questionKey ? { ...q, options: q.options.filter((o) => o.key !== optionKey) } : q
      )
    );
  }

  function resetQuestionDrag() {
    setDragQuestionKey(null);
    setDragOverQuestionKey(null);
  }

  // Larga em cima de outra pergunta: fica adjacente a ela, herdando a
  // secção dessa pergunta (permite mover entre secções).
  function handleQuestionDrop(targetKey: string) {
    if (!dragQuestionKey || dragQuestionKey === targetKey) {
      resetQuestionDrag();
      return;
    }
    setQuestions((qs) => {
      const dragIdx = qs.findIndex((q) => q.key === dragQuestionKey);
      const targetSectionKey = qs.find((q) => q.key === targetKey)?.sectionKey;
      if (dragIdx === -1 || !targetSectionKey) return qs;
      const next = [...qs];
      const [moved] = next.splice(dragIdx, 1);
      const targetIdx = next.findIndex((q) => q.key === targetKey);
      next.splice(targetIdx, 0, { ...moved, sectionKey: targetSectionKey });
      return next;
    });
    resetQuestionDrag();
  }

  // Larga na área de uma secção (fora de uma pergunta específica): vai
  // para o fim dessa secção.
  function handleSectionZoneDrop(sectionKey: string) {
    if (!dragQuestionKey) return;
    setQuestions((qs) => {
      const dragIdx = qs.findIndex((q) => q.key === dragQuestionKey);
      if (dragIdx === -1) return qs;
      const next = [...qs];
      const [moved] = next.splice(dragIdx, 1);
      let insertAt = next.length;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].sectionKey === sectionKey) {
          insertAt = i + 1;
          break;
        }
      }
      next.splice(insertAt, 0, { ...moved, sectionKey });
      return next;
    });
    resetQuestionDrag();
  }

  // --- Consequências ---

  function addRule() {
    setRules((rs) => [...rs, emptyRule()]);
  }

  function updateRule(key: string, patch: Partial<RuleState>) {
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRule(key: string) {
    setRules((rs) => rs.filter((r) => r.key !== key));
  }

  // --- Atribuição ---

  function toggleTeam(id: string) {
    setTeamIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function toggleEmployee(id: string) {
    setEmployeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");

    const payload: TemplatePayload = {
      name,
      hasSelfEvaluation,
      sections: sections.map((s) => ({ key: s.key, title: s.title })),
      questions: questions.map((q) => ({
        sectionKey: q.sectionKey,
        text: q.text,
        type: q.type,
        maxScore: q.type === "TEXT" ? 0 : q.maxScore,
        scaleMin: q.type === "SCALE" ? q.scaleMin : undefined,
        scaleMax: q.type === "SCALE" ? q.scaleMax : undefined,
        options: q.options.map((o) => ({ label: o.label, points: o.points })),
      })),
      consequenceRules: rules.map((r) => ({ minPercent: r.minPercent, consequence: r.consequence })),
      teamIds,
      employeeIds,
    };

    startTransition(async () => {
      try {
        if (initial) {
          await updateTemplate(initial.id, payload);
          setStatus("success");
          setMessage("Modelo atualizado com sucesso.");
          router.refresh();
        } else {
          const created = await createTemplate(payload);
          router.push(`/avaliacoes/${created.id}`);
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Ocorreu um erro ao gravar o modelo.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SaveBanner status={status} message={message} />

      <Card>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Nome do modelo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex.: Avaliação anual — Comercial"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <label className="mt-4 flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={hasSelfEvaluation}
            onChange={(e) => setHasSelfEvaluation(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 dark:border-stone-600"
          />
          Permite autoavaliação (o colaborador preenche a sua própria cópia, só informativa)
        </label>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Perguntas</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              totalOk
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            Total: {total}/100 pontos
          </span>
        </div>

        {isUsed && (
          <p className="mb-4 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <Info size={14} className="mt-0.5 shrink-0" />
            Este modelo já tem avaliações associadas — as secções e perguntas não podem ser
            alteradas. Crie um novo modelo se precisar de mudar a estrutura.
          </p>
        )}

        <div className="space-y-6">
          {sections.map((section, sIdx) => {
            const sectionQuestions = questions.filter((q) => q.sectionKey === section.key);
            return (
              <div
                key={section.key}
                data-testid={`section-${sIdx}`}
                draggable={!isUsed}
                onDragStart={() => setDragSectionKey(section.key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverSectionKey(section.key);
                }}
                onDrop={() => handleSectionDrop(section.key)}
                onDragEnd={() => {
                  setDragSectionKey(null);
                  setDragOverSectionKey(null);
                }}
                className={`rounded-xl border p-4 ${
                  dragOverSectionKey === section.key && dragSectionKey !== null && dragSectionKey !== section.key
                    ? "border-violet-400 bg-violet-50/50 dark:bg-violet-500/5"
                    : "border-stone-300 dark:border-stone-700"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {!isUsed && (
                    <span className="cursor-grab text-stone-400 active:cursor-grabbing">
                      <GripVertical size={16} />
                    </span>
                  )}
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.key, e.target.value)}
                    disabled={isUsed}
                    required
                    placeholder="Título da secção"
                    className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(section.key)}
                    disabled={isUsed || sections.length === 1}
                    className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSectionZoneDrop(section.key)}
                  className="space-y-4"
                >
                  {sectionQuestions.map((q, i) => (
                    <div
                      key={q.key}
                      data-testid={`question-card-${sIdx}-${i}`}
                      draggable={!isUsed}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDragQuestionKey(q.key);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverQuestionKey(q.key);
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleQuestionDrop(q.key);
                      }}
                      onDragEnd={resetQuestionDrag}
                      className={`rounded-lg border p-4 ${
                        dragOverQuestionKey === q.key && dragQuestionKey !== null && dragQuestionKey !== q.key
                          ? "border-violet-400 bg-violet-50/50 dark:bg-violet-500/5"
                          : "border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <div className="mb-3 flex items-start gap-2">
                        {!isUsed && (
                          <span className="mt-2 cursor-grab text-stone-400 active:cursor-grabbing">
                            <GripVertical size={15} />
                          </span>
                        )}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
                            disabled={isUsed}
                            required
                            placeholder={`Pergunta ${i + 1}`}
                            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.key)}
                          disabled={isUsed}
                          className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                            Tipo
                          </label>
                          <select
                            value={q.type}
                            disabled={isUsed}
                            onChange={(e) =>
                              updateQuestion(q.key, { type: e.target.value as QuestionType, options: [] })
                            }
                            className="rounded-md border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {QUESTION_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {q.type !== "TEXT" && (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                              Peso (pontos)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={q.maxScore}
                              disabled={isUsed}
                              onChange={(e) => updateQuestion(q.key, { maxScore: Number(e.target.value) })}
                              className="w-24 rounded-md border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                            />
                          </div>
                        )}

                        {q.type === "SCALE" && (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                                Escala mínima
                              </label>
                              <input
                                type="number"
                                value={q.scaleMin}
                                disabled={isUsed}
                                onChange={(e) => updateQuestion(q.key, { scaleMin: Number(e.target.value) })}
                                className="w-20 rounded-md border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                                Escala máxima
                              </label>
                              <input
                                type="number"
                                value={q.scaleMax}
                                disabled={isUsed}
                                onChange={(e) => updateQuestion(q.key, { scaleMax: Number(e.target.value) })}
                                className="w-20 rounded-md border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                              />
                            </div>
                            {q.scaleMax > 0 && (
                              <p className="w-full text-[11px] text-stone-500 dark:text-stone-400">
                                O avaliador escolhe um valor entre {q.scaleMin} e {q.scaleMax}; a pontuação é
                                proporcional ao peso — escolher {q.scaleMax} (máximo) vale {q.maxScore} pontos,
                                escolher {Math.round(q.scaleMax / 2)} vale{" "}
                                {Math.round((Math.round(q.scaleMax / 2) / q.scaleMax) * q.maxScore)} pontos.
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {q.type === "SINGLE_CHOICE" && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                            Opções (com a pontuação atribuída a cada uma)
                          </label>
                          {q.options.map((o) => (
                            <div key={o.key} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={o.label}
                                disabled={isUsed}
                                onChange={(e) => updateOption(q.key, o.key, { label: e.target.value })}
                                placeholder="Ex.: Bom"
                                className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                              />
                              <input
                                type="number"
                                min={0}
                                max={q.maxScore}
                                value={o.points}
                                disabled={isUsed}
                                onChange={(e) => updateOption(q.key, o.key, { points: Number(e.target.value) })}
                                className="w-20 rounded-md border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(q.key, o.key)}
                                disabled={isUsed}
                                className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(q.key)}
                            disabled={isUsed}
                            className="flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline disabled:opacity-40 dark:text-violet-400"
                          >
                            <Plus size={12} /> Adicionar opção
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addQuestion(section.key)}
                    disabled={isUsed}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <Plus size={14} /> Adicionar pergunta a esta secção
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addSection}
          disabled={isUsed}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <Plus size={14} /> Adicionar secção
        </button>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Consequências por resultado
        </h2>
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          Ex.: a partir de 60% → &quot;Progressão de carreira&quot;. Aplica-se sempre a faixa mais alta
          que a percentagem final ainda alcance.
        </p>
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={r.key} data-testid={`rule-row-${i}`} className="flex items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400">A partir de</span>
              <input
                type="number"
                min={0}
                max={100}
                value={r.minPercent}
                onChange={(e) => updateRule(r.key, { minPercent: Number(e.target.value) })}
                className="w-20 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">%</span>
              <input
                type="text"
                value={r.consequence}
                onChange={(e) => updateRule(r.key, { consequence: e.target.value })}
                placeholder="Consequência (ex.: Progressão de carreira)"
                className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={() => removeRule(r.key)}
                className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRule}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <Plus size={14} /> Adicionar regra
        </button>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Atribuição</h2>
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          A quem fica disponível este modelo — por equipa (todos os colaboradores atuais dessa equipa)
          e/ou por colaborador específico. Clique para selecionar/retirar.
        </p>
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Equipas {teamIds.length > 0 && `(${teamIds.length} selecionada${teamIds.length > 1 ? "s" : ""})`}
            </label>
            <div className="h-40 w-64 overflow-y-auto rounded-md border border-stone-300 p-1 dark:border-stone-700">
              {teams.map((t) => {
                const checked = teamIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      checked
                        ? "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300"
                        : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(t.id)}
                      className="h-4 w-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 dark:border-stone-600"
                    />
                    {t.name} ({t.departmentName})
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Colaboradores{" "}
              {employeeIds.length > 0 && `(${employeeIds.length} selecionado${employeeIds.length > 1 ? "s" : ""})`}
            </label>
            <div className="h-40 w-64 overflow-y-auto rounded-md border border-stone-300 p-1 dark:border-stone-700">
              {employees.map((e) => {
                const checked = employeeIds.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      checked
                        ? "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300"
                        : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmployee(e.id)}
                      className="h-4 w-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 dark:border-stone-600"
                    />
                    {e.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !totalOk}>
          {pending ? "A gravar…" : initial ? "Guardar alterações" : "Criar modelo"}
        </Button>
      </div>
    </form>
  );
}
