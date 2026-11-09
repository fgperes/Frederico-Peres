"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Stethoscope } from "lucide-react";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { SchedulingModal } from "@/app/(app)/medicina-trabalho/scheduling-modal";
import { ResultModal } from "@/app/(app)/medicina-trabalho/result-modal";
import { confirmRealizationAction } from "@/app/(app)/medicina-trabalho/actions";
import { WORK_MEDICINE_STATUS_LABELS, WORK_MEDICINE_RESULT_LABELS } from "@/lib/work-medicine";

type EntityOption = { id: string; name: string; addresses: { id: string; address: string }[] };

export type AppointmentRow = {
  id: string;
  employeeId: string;
  entityId: string | null;
  entityName: string | null;
  addressId: string | null;
  addressLabel: string | null;
  scheduledAt: string;
  status: string;
  resultStatus: string | null;
  resultNotes: string | null;
  resultDocumentName: string | null;
  resultDocumentData: string | null;
};

const STATUS_COLOR: Record<string, "amber" | "blue" | "green" | "slate" | "red"> = {
  AGENDADA: "blue",
  A_CONFIRMAR_REALIZACAO: "amber",
  PENDENTE_RESULTADO: "amber",
  FECHADA: "slate",
};

export function MedicinaTrabalhoEmployeePanel({
  employeeId,
  canEdit,
  entities,
  initialAppointments,
}: {
  employeeId: string;
  canEdit: boolean;
  entities: EntityOption[];
  initialAppointments: AppointmentRow[];
}) {
  const [showNew, setShowNew] = useState(false);
  const [rescheduling, setRescheduling] = useState<AppointmentRow | null>(null);
  const [closing, setClosing] = useState<AppointmentRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirmRealization(row: AppointmentRow) {
    startTransition(async () => {
      await confirmRealizationAction(row.id, employeeId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setShowNew(true)}>
            <Plus size={15} /> Agendar nova
          </Button>
        </div>
      )}

      {initialAppointments.length === 0 ? (
        <Card>
          <EmptyState icon={Stethoscope} message="Sem medicina do trabalho registada para este colaborador." />
        </Card>
      ) : (
        <div className="space-y-3">
          {initialAppointments.map((row) => {
            const badgeLabel = WORK_MEDICINE_STATUS_LABELS[row.status as keyof typeof WORK_MEDICINE_STATUS_LABELS] ?? row.status;
            const badgeColor = STATUS_COLOR[row.status] ?? "slate";
            const dateLabel = new Date(row.scheduledAt).toLocaleDateString("pt-PT");
            const timeLabel = new Date(row.scheduledAt).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <Card key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {dateLabel} às {timeLabel}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {row.entityName ?? "Entidade a definir"}
                      {row.addressLabel ? ` · ${row.addressLabel}` : ""}
                    </p>
                  </div>
                  <Badge color={badgeColor}>{badgeLabel}</Badge>
                </div>

                {row.resultStatus && (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm dark:bg-stone-800/60">
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      Resultado: {WORK_MEDICINE_RESULT_LABELS[row.resultStatus] ?? row.resultStatus}
                    </p>
                    {row.resultNotes && (
                      <p className="mt-0.5 text-stone-600 dark:text-stone-300">{row.resultNotes}</p>
                    )}
                    {row.resultDocumentData && (
                      <a
                        href={row.resultDocumentData}
                        download={row.resultDocumentName ?? "documento"}
                        className="mt-1 inline-block text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                      >
                        Ver documento
                      </a>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(row.status === "AGENDADA" || row.status === "A_CONFIRMAR_REALIZACAO") && (
                      <button
                        type="button"
                        onClick={() => setRescheduling(row)}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        Reagendar
                      </button>
                    )}
                    {row.status === "A_CONFIRMAR_REALIZACAO" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleConfirmRealization(row)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        Confirmar realização
                      </button>
                    )}
                    {row.status === "PENDENTE_RESULTADO" && (
                      <button
                        type="button"
                        onClick={() => setClosing(row)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                      >
                        Registar resultado
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {canEdit && (
        <SchedulingModal open={showNew} onClose={() => setShowNew(false)} entities={entities} fixedEmployeeId={employeeId} />
      )}

      {canEdit && rescheduling && (
        <SchedulingModal
          open={true}
          onClose={() => setRescheduling(null)}
          entities={entities}
          fixedEmployeeId={employeeId}
          appointmentId={rescheduling.id}
          initialEntityId={rescheduling.entityId ?? ""}
          initialAddressId={rescheduling.addressId ?? ""}
          initialDate={rescheduling.scheduledAt.slice(0, 10)}
          initialTime={new Date(rescheduling.scheduledAt).toTimeString().slice(0, 5)}
        />
      )}

      {canEdit && closing && (
        <ResultModal open={true} onClose={() => setClosing(null)} appointmentId={closing.id} employeeId={employeeId} />
      )}
    </div>
  );
}
