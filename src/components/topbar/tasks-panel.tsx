"use client";

import { useTransition } from "react";
import { ListTodo, Check } from "lucide-react";
import { completeTask } from "./actions";
import type { TaskItem } from "@/lib/tasks";
import { formatDateTime } from "@/lib/format";

export function TasksPanel({ tasks }: { tasks: TaskItem[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-700">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Tarefas</p>
      </div>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <ListTodo size={20} className="text-stone-400" />
          <p className="text-xs text-stone-500 dark:text-stone-400">Sem tarefas pendentes.</p>
        </div>
      ) : (
        <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{task.title}</p>
                {task.employeeName && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">Colaborador: {task.employeeName}</p>
                )}
                {task.description && (
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{task.description}</p>
                )}
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {formatDateTime(task.createdAt)}
                </p>
              </div>
              <button
                type="button"
                title="Marcar como concluída"
                disabled={pending}
                onClick={() => startTransition(() => completeTask(task.id))}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400"
              >
                <Check size={13} strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
