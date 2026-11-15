// A API "nova" (orientada a objetos) do expo-calendar 57.x não tem as
// funções que usamos aqui — ficam só na "legacy", que é a forma estável
// de continuar a usar os mesmos nomes (requestPermissionsAsync,
// getDefaultCalendarAsync, getCalendarsAsync, createEventAsync).
import * as Calendar from "expo-calendar/legacy";

export type WritableCalendar = { id: string; label: string };

// Procura um calendário do dispositivo onde seja possível criar eventos —
// primeiro o calendário por omissão (só existe em alguns dispositivos/
// contas), senão o primeiro que permita modificações. Devolve também um
// nome identificável (calendário + conta) para dizer ao utilizador onde
// foi parar o evento — em dispositivos com várias contas/calendários não
// é óbvio qual foi escolhido.
export async function getWritableCalendar(): Promise<WritableCalendar> {
  const { status } = await Calendar.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Sem permissão para aceder ao calendário.");
  }

  let calendar: Calendar.Calendar | null = null;
  try {
    calendar = await Calendar.getDefaultCalendarAsync();
  } catch {
    // Alguns dispositivos/contas Android não têm um calendário por omissão.
  }
  if (!calendar) {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    calendar = calendars.find((c) => c.allowsModifications) ?? null;
  }
  if (!calendar) {
    throw new Error("Não foi encontrado nenhum calendário disponível neste dispositivo.");
  }
  const account = calendar.source?.name ?? calendar.source?.id;
  return { id: calendar.id, label: account ? `${calendar.title} (${account})` : calendar.title };
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
