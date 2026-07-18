"use client";

import { useState } from "react";
import type { Department, Location, Team, Employee } from "@prisma/client";
import { ID_DOCUMENT_TYPES, ID_DOCUMENT_TYPE_LABELS } from "@/lib/employee-constants";

export function EmployeeForm({
  action,
  departments,
  teams,
  locations,
  managers,
  employee,
}: {
  action: (formData: FormData) => void;
  departments: Department[];
  teams: Team[];
  locations: Location[];
  managers: Employee[];
  employee?: Employee | null;
}) {
  const [noExpiry, setNoExpiry] = useState(employee?.idDocumentNoExpiry ?? false);

  return (
    <form action={action} className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Dados Pessoais
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome próprio" name="firstName" defaultValue={employee?.firstName} required />
          <Field label="Apelido" name="lastName" defaultValue={employee?.lastName} required />
          <Field label="Email" name="email" type="email" defaultValue={employee?.email} required />
          <Field label="Telefone" name="phone" defaultValue={employee?.phone ?? ""} />
          <Field label="NIF" name="nif" defaultValue={employee?.nif ?? ""} />
          <Field label="IBAN" name="iban" defaultValue={employee?.iban ?? ""} />
          <Field label="Nº do documento de identificação" name="idDocument" defaultValue={employee?.idDocument ?? ""} />
          <SelectField
            label="Tipo de documento de identificação"
            name="idDocumentType"
            defaultValue={employee?.idDocumentType ?? ""}
            options={ID_DOCUMENT_TYPES.map((t) => ({ value: t, label: ID_DOCUMENT_TYPE_LABELS[t] }))}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Data de caducidade
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                name="idDocumentExpiry"
                disabled={noExpiry}
                defaultValue={
                  employee?.idDocumentExpiry
                    ? employee.idDocumentExpiry.toISOString().slice(0, 10)
                    : ""
                }
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:disabled:bg-stone-900 dark:disabled:text-stone-600"
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400">
                <input
                  type="checkbox"
                  name="idDocumentNoExpiry"
                  checked={noExpiry}
                  onChange={(e) => setNoExpiry(e.target.checked)}
                  className="rounded border-stone-300"
                />
                Vitalício
              </label>
            </div>
            {!noExpiry &&
              employee?.idDocumentExpiry &&
              new Date(employee.idDocumentExpiry) < new Date() && (
                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  Documento caducado — peça uma cópia atualizada ao colaborador.
                </p>
              )}
          </div>
          <Field label="Nº Segurança Social" name="socialSecurityNo" defaultValue={employee?.socialSecurityNo ?? ""} />
          <Field label="Morada" name="address" defaultValue={employee?.address ?? ""} className="sm:col-span-2" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Dados Organizacionais
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Função / Cargo" name="jobTitle" defaultValue={employee?.jobTitle} required />
          <SelectField
            label="Departamento"
            name="departmentId"
            defaultValue={employee?.departmentId ?? ""}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <SelectField
            label="Equipa"
            name="teamId"
            defaultValue={employee?.teamId ?? ""}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
          />
          <SelectField
            label="Local de trabalho"
            name="locationId"
            defaultValue={employee?.locationId ?? ""}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
          <SelectField
            label="Chefia direta"
            name="managerId"
            defaultValue={employee?.managerId ?? ""}
            options={managers
              .filter((m) => m.id !== employee?.id)
              .map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }))}
          />
          <Field label="Data de admissão" name="hireDate" type="date"
            defaultValue={employee?.hireDate ? employee.hireDate.toISOString().slice(0, 10) : ""} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Especificações para Horários
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo de vínculo"
            name="employmentType"
            defaultValue={employee?.employmentType ?? "FULL_TIME"}
            options={[
              { value: "FULL_TIME", label: "Full-time" },
              { value: "PART_TIME", label: "Part-time" },
            ]}
          />
          <Field
            label="Horas semanais contratuais"
            name="weeklyHours"
            type="number"
            step="0.5"
            defaultValue={employee?.weeklyHours ?? 40}
            required
          />
          <Field
            label="Restrições (ex.: não trabalha ao domingo)"
            name="restrictions"
            defaultValue={employee?.restrictions ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="Preferências de turno"
            name="shiftPreferences"
            defaultValue={employee?.shiftPreferences ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="Competências (separadas por vírgula)"
            name="skills"
            defaultValue={employee?.skills ?? ""}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  className = "",
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  className?: string;
  step?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
        {label}
      </label>
      <input
        type={type}
        name={name}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
