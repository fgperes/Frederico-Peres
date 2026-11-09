"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileCheck2 } from "lucide-react";
import { Card, Badge, Button, TableScroll, EmptyState } from "@/components/ui";
import { SchedulingModal } from "../scheduling-modal";
import { ResultModal } from "../result-modal";
import { confirmRealizationAction } from "../actions";
import { WORK_MEDICINE_STATUS_LABELS, WORK_MEDICINE_RESULT_LABELS } from "@/lib/work-medicine";

type EntityOption = { id: string; name: string; addresses: { id: string; address: string }[] };
type EmployeeOption = { id: string; name: string };

export type AppointmentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
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

export function AgendamentoPanel({
  canEdit,
  entities,
  employees,
  initialAppointments,
}: {
  canEdit: boolean;
  entities: EntityOption[];
  employees: EmployeeOption[];
  initialAppointments: AppointmentRow[];
}) {
  const [showNew, setShowNew] = useState(false);
  const [rescheduling, setRescheduling] = useState<AppointmentRow | null>(null);
  const [closing, setClosing] = useState<AppointmentRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirmRealization(row: AppointmentRow) {
    startTransition(async () => {
      await confirmRealizationAction(row.id, row.employeeId);
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
          <EmptyState icon={FileCheck2} message="Sem agendamentos de medicina do trabalho." />
        </Card>
      ) : (
        <Card>
          <TableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="py-2 pr-3">Colaborador</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Entidade / Morada</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Resultado</th>
                  {canEdit && <th className="py-2 pr-3">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {initialAppointments.map((row) => {
                  const badgeLabel = WORK_MEDICINE_STATUS_LABELS[row.status as keyof typeof WORK_MEDICINE_STATUS_LABELS] ?? row.status;
                  const badgeColor = STATUS_COLOR[row.status] ?? "slate";
                  const dateLabel = new Date(row.scheduledAt).toLocaleDateString("pt-PT");
                  const timeLabel = new Date(row.scheduledAt).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={row.id}>
                      <td className="py-2 pr-3 text-stone-900 dark:text-stone-100">{row.employeeName}</td>
                      <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">
                        {dateLabel} às {timeLabel}
                      </td>
                      <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">
                        {row.entityName ?? "—"}
                        {row.addressLabel ? ` · ${row.addressLabel}` : ""}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge color={badgeColor}>{badgeLabel}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {row.resultStatus ? (
                          <div className="flex items-center gap-2">
                            <Badge color={row.resultStatus === "APTO" ? "green" : "red"}>
                              {WORK_MEDICINE_RESULT_LABELS[row.resultStatus] ?? row.resultStatus}
                            </Badge>
                            {row.resultDocumentData && (
                              <a
                                href={row.resultDocumentData}
                                download={row.resultDocumentName ?? "documento"}
                                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                              >
                                Documento
                              </a>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-2">
                            {(row.status === "AGENDADA" || row.status === "A_CONFIRMAR_REALIZACAO") && (
                              <button
                                type="button"
                                onClick={() => setRescheduling(row)}
                                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                              >
                                Reagendar
                              </button>
                            )}
                            {row.status === "A_CONFIRMAR_REALIZACAO" && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => handleConfirmRealization(row)}
                                className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-60 dark:text-violet-400"
                              >
                                Confirmar realização
                              </button>
                            )}
                            {row.status === "PENDENTE_RESULTADO" && (
                              <button
                                type="button"
                                onClick={() => setClosing(row)}
                                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                              >
                                Registar resultado
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      )}

      {canEdit && (
        <SchedulingModal
          open={showNew}
          onClose={() => setShowNew(false)}
          entities={entities}
          employees={employees}
        />
      )}

      {canEdit && rescheduling && (
        <SchedulingModal
          open={true}
          onClose={() => setRescheduling(null)}
          entities={entities}
          fixedEmployeeId={rescheduling.employeeId}
          appointmentId={rescheduling.id}
          initialEntityId={rescheduling.entityId ?? ""}
          initialAddressId={rescheduling.addressId ?? ""}
          initialDate={rescheduling.scheduledAt.slice(0, 10)}
          initialTime={new Date(rescheduling.scheduledAt).toTimeString().slice(0, 5)}
        />
      )}

      {canEdit && closing && (
        <ResultModal
          open={true}
          onClose={() => setClosing(null)}
          appointmentId={closing.id}
          employeeId={closing.employeeId}
        />
      )}
    </div>
  );
}
