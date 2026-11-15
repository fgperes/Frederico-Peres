// A API "nova" (orientada a objetos) do expo-calendar 57.x não tem as
// funções que usamos aqui — ficam só na "legacy", que é a forma estável
// de continuar a usar os mesmos nomes (requestPermissionsAsync,
// getDefaultCalendarAsync, getCalendarsAsync, createEventAsync).
import * as Calendar from "expo-calendar/legacy";

export type WritableCalendar = { id: string; label: string; isDefault: boolean };

function labelFor(calendar: Calendar.Calendar): string {
  const account = calendar.source?.name ?? calendar.source?.id;
  return account ? `${calendar.title} (${account})` : calendar.title;
}

// Lista todos os calendários do dispositivo onde é possível criar eventos —
// cada pessoa pode ter várias contas/calendários (pessoal, trabalho, local
// do telemóvel, etc.), por isso não se escolhe um sozinho: quem usa a app
// é que decide, a não ser que só exista um disponível.
export async function listWritableCalendars(): Promise<WritableCalendar[]> {
  const { status } = await Calendar.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Sem permissão para aceder ao calendário.");
  }

  let defaultId: string | null = null;
  try {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    defaultId = defaultCalendar?.id ?? null;
  } catch {
    // Alguns dispositivos/contas Android não têm um calendário por omissão.
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, label: labelFor(c), isDefault: c.id === defaultId }));

  if (writable.length === 0) {
    throw new Error("Não foi encontrado nenhum calendário disponível neste dispositivo.");
  }
  // O calendário por omissão (quando existe) fica sempre em primeiro.
  writable.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return writable;
}

// Evento de dia inteiro (mais simples e fiável entre calendários/dispositivos
// do que um evento com hora exata) — a hora do turno fica no título.
export async function addShiftToCalendar(
  calendarId: string,
  params: { date: string; startTime: string; endTime: string; title: string; location?: string | null }
): Promise<void> {
  const dayStart = new Date(`${params.date.slice(0, 10)}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  await Calendar.createEventAsync(calendarId, {
    title: `${params.title} (${params.startTime}–${params.endTime})`,
    startDate: dayStart,
    endDate: dayEnd,
    allDay: true,
    location: params.location ?? undefined,
    notes: "people4people",
  });
}
