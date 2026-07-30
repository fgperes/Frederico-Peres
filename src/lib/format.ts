// Fuso horário de Portugal continental. O IANA tzdata (usado pelo Intl do
// Node) já sabe que a hora muda no último domingo de março (+1h, hora de
// verão) e no último domingo de outubro (-1h, hora de inverno) — não
// precisamos de calcular isto à mão, só de fixar o fuso em vez de deixar
// o Intl usar o fuso do servidor (UTC na Vercel, o que mostrava sempre a
// hora de inverno mesmo no verão).
const TIMEZONE = "Europe/Lisbon";

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-PT", { timeZone: TIMEZONE });
}
