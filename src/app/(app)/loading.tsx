export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-violet-600 dark:border-stone-700 dark:border-t-violet-400"
        role="status"
        aria-label="A carregar…"
      />
    </div>
  );
}
