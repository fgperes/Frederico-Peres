"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2, GraduationCap } from "lucide-react";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteTraining } from "../actions";
import { TrainingModal } from "./training-modal";
import { EnrollModal } from "./enroll-modal";

type Modality = { id: string; code: string; description: string; active: boolean };
type EntityOption = { id: string; name: string };
type EmployeeOption = { id: string; name: string };

export type TrainingRow = {
  id: string;
  name: string;
  modalityLabel: string;
  entityName: string | null;
  description: string | null;
  totalHours: number;
  firstDate: string | null;
  lastDate: string | null;
  sessionCount: number;
  enrolledEmployeeIds: string[];
  enrolledNames: string[];
};

export function FormacoesPanel({
  canEdit,
  modalities,
  entities,
  employees,
  initialTrainings,
}: {
  canEdit: boolean;
  modalities: Modality[];
  entities: EntityOption[];
  employees: EmployeeOption[];
  initialTrainings: TrainingRow[];
}) {
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [enrolling, setEnrolling] = useState<TrainingRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleDelete(training: TrainingRow) {
    const ok = await confirm(
      `Tem a certeza que quer eliminar "${training.name}"? Os colaboradores inscritos perdem as horas associadas a esta formação.`,
      { title: "Eliminar formação", confirmLabel: "Eliminar" }
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteTraining(training.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setShowTrainingModal(true)}>
            <Plus size={15} /> Nova formação
          </Button>
        </div>
      )}

      {initialTrainings.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} message="Sem formações registadas." />
        </Card>
      ) : (
        <div className="space-y-3">
          {initialTrainings.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{t.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t.modalityLabel}
                    {t.entityName ? ` · ${t.entityName}` : ""}
                    {t.firstDate &&
                      ` · ${new Date(t.firstDate).toLocaleDateString("pt-PT")}${
                        t.lastDate && t.lastDate !== t.firstDate
                          ? ` a ${new Date(t.lastDate).toLocaleDateString("pt-PT")}`
                          : ""
                      }`}
                  </p>
                  {t.description && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{t.description}</p>}
                </div>
                <Badge color="blue">{t.totalHours}h</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <Users size={13} />
                  {t.enrolledNames.length === 0 ? "Sem colaboradores inscritos" : t.enrolledNames.join(", ")}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrolling(t)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      Associar colaboradores
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      disabled={pending}
                      title="Eliminar formação"
                      className="text-stone-400 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canEdit && (
        <TrainingModal
          open={showTrainingModal}
          onClose={() => setShowTrainingModal(false)}
          modalities={modalities}
          entities={entities}
        />
      )}

      {canEdit && enrolling && (
        <EnrollModal
          open={true}
          onClose={() => setEnrolling(null)}
          trainingId={enrolling.id}
          trainingName={enrolling.name}
          employees={employees}
          initialEnrolledIds={enrolling.enrolledEmployeeIds}
        />
      )}

      {confirmDialog}
    </div>
  );
}
