import { prisma } from "@/lib/prisma";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  createdAt: Date;
  employeeName: string | null;
};

export async function getOpenTasks(userId: string): Promise<TaskItem[]> {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId, status: "OPEN" },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    createdAt: t.createdAt,
    employeeName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : null,
  }));
}
