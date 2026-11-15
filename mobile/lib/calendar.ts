import * as Calendar from "expo-calendar";

// Procura um calendário do dispositivo onde seja possível criar eventos —
// primeiro o calendário por omissão (só existe em alguns dispositivos/
// contas), senão o primeiro que permita modificações.
export async function getWritableCalendarId(): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Sem permissão para aceder ao calendário.");
  }

  let calendarId: string | null = null;
  try {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    calendarId = defaultCalendar?.id ?? null;
  } catch {
    // Alguns dispositivos/contas Android não têm um calendário por omissão.
  }
  if (!calendarId) {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find((c) => c.allowsModifications);
    calendarId = writable?.id ?? null;
  }
  if (!calendarId) {
    throw new Error("Não foi encontrado nenhum calendário disponível neste dispositivo.");
  }
  return calendarId;
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
