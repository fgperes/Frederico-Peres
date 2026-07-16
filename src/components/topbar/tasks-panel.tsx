import { ListTodo } from "lucide-react";

// Placeholder: as regras/origem das tarefas ainda serão definidas.
export function TasksPanel() {
  return (
    <div>
      <div className="border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">Tarefas</p>
      </div>
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <ListTodo size={20} className="text-stone-400" />
        <p className="text-xs text-stone-500">
          Módulo de tarefas em preparação.
        </p>
      </div>
    </div>
  );
}
