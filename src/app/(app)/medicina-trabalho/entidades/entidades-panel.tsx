"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin, Trash2, Power, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Badge, Button, Input, EmptyState } from "@/components/ui";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import {
  createWorkMedicineEntity,
  toggleWorkMedicineEntityActive,
  createWorkMedicineAddress,
  deleteWorkMedicineAddress,
} from "../actions";

type Address = { id: string; address: string; postalCode: string | null };
type Entity = { id: string; name: string; nif: string; active: boolean; addresses: Address[] };

export function EntidadesPanel({
  canEdit,
  initialEntities,
}: {
  canEdit: boolean;
  initialEntities: Entity[];
}) {
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !nif.trim()) return;
    setStatus("idle");
    startTransition(async () => {
      const result = await createWorkMedicineEntity({ name, nif });
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setName("");
      setNif("");
      setStatus("success");
      setMessage("Entidade criada.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Nova entidade</h2>
          <SaveBanner status={status} message={message} />
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <Input
              placeholder="Nome da entidade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-64"
            />
            <Input placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} className="w-40" />
            <Button type="submit" disabled={pending}>
              <Plus size={15} /> Adicionar
            </Button>
          </form>
        </Card>
      )}

      {initialEntities.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} message="Sem entidades parceiras registadas." />
        </Card>
      ) : (
        <div className="space-y-4">
          {initialEntities.map((entity) => (
            <EntityCard key={entity.id} entity={entity} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntityCard({ entity, canEdit }: { entity: Entity; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggleActive() {
    startTransition(async () => {
      await toggleWorkMedicineEntityActive(entity.id);
      router.refresh();
    });
  }

  function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createWorkMedicineAddress({ entityId: entity.id, address, postalCode });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAddress("");
      setPostalCode("");
      setShowAddressForm(false);
      router.refresh();
    });
  }

  function handleDeleteAddress(addressId: string) {
    startTransition(async () => {
      const result = await deleteWorkMedicineAddress(addressId);
      if (!result.error) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{entity.name}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">NIF {entity.nif}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={entity.active ? "green" : "slate"}>{entity.active ? "Ativo" : "Inativo"}</Badge>
          {canEdit && (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={pending}
              title={entity.active ? "Desativar parceiro" : "Ativar parceiro"}
              className="flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Power size={13} /> {entity.active ? "Desativar" : "Ativar"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <span>Moradas ({entity.addresses.length})</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="mt-2">
            {entity.addresses.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-stone-500">Sem moradas registadas.</p>
            ) : (
              <ul className="space-y-1.5">
                {entity.addresses.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800/60"
                  >
                    <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                      <MapPin size={13} className="shrink-0 text-stone-400" />
                      {a.address}
                      {a.postalCode ? ` · ${a.postalCode}` : ""}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(a.id)}
                        disabled={pending}
                        title="Eliminar morada"
                        className="text-stone-400 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <div className="mt-3">
                {!showAddressForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    + Adicionar morada
                  </button>
                ) : (
                  <form onSubmit={handleAddAddress} className="flex flex-wrap items-end gap-2">
                    <Input
                      placeholder="Morada"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-56"
                    />
                    <Input
                      placeholder="Código postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-32"
                    />
                    <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
                      Guardar
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400"
                    >
                      Cancelar
                    </button>
                    {error && <p className="w-full text-xs text-rose-600 dark:text-rose-400">{error}</p>}
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
