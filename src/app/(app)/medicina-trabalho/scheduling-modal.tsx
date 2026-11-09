"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { Button, Select } from "@/components/ui";
import { scheduleAppointmentAction, rescheduleAppointmentAction } from "./actions";

type EntityOption = {
  id: string;
  name: string;
  addresses: { id: string; address: string }[];
};

export function SchedulingModal({
  open,
  onClose,
  entities,
  employees,
  fixedEmployeeId,
  appointmentId,
  initialEntityId = "",
  initialAddressId = "",
  initialDate = "",
  initialTime = "",
}: {
  open: boolean;
  onClose: () => void;
  entities: EntityOption[];
  employees?: { id: string; name: string }[];
  fixedEmployeeId?: string;
  appointmentId?: string; // presente = reagendar; ausente = novo agendamento
  initialEntityId?: string;
  initialAddressId?: string;
  initialDate?: string;
  initialTime?: string;
}) {
  const [employeeId, setEmployeeId] = useState(fixedEmployeeId ?? employees?.[0]?.id ?? "");
  const [entityId, setEntityId] = useState(initialEntityId);
  const [addressId, setAddressId] = useState(initialAddressId);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedEntity = entities.find((e) => e.id === entityId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalEmployeeId = fixedEmployeeId ?? employeeId;
    setError(null);
    startTransition(async () => {
      const result = appointmentId
        ? await rescheduleAppointmentAction({
            appointmentId,
            employeeId: finalEmployeeId,
            entityId,
            addressId,
            date,
            time,
          })
        : await scheduleAppointmentAction({ employeeId: finalEmployeeId, entityId, addressId, date, time });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={appointmentId ? "Reagendar medicina do trabalho" : "Agendar medicina do trabalho"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {employees && !fixedEmployeeId && (
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Colaborador
            </label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex gap-3">
          <DateField label="Data" value={date} onChange={setDate} required className="flex-1" />
          <TimeField label="Hora" value={time} onChange={setTime} required className="w-32" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Entidade parceira
          </label>
          <Select
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setAddressId("");
            }}
          >
            <option value="">A definir</option>
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name}
              </option>
            ))}
          </Select>
        </div>

        {selectedEntity && selectedEntity.addresses.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Morada</label>
            <Select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
              <option value="">A definir</option>
              {selectedEntity.addresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.address}
                </option>
              ))}
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {appointmentId ? "Reagendar" : "Agendar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
