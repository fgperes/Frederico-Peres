import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { EstruturaTabs } from "../tabs";
import Link from "next/link";
import { Network } from "lucide-react";

type Node = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentName: string | null;
  children: Node[];
};

export default async function OrganogramaPage() {
  await requireUser();

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      managerId: true,
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const nodeById = new Map<string, Node>(
    employees.map((e) => [
      e.id,
      {
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        jobTitle: e.jobTitle,
        departmentName: e.department?.name ?? null,
        children: [],
      },
    ])
  );

  const roots: Node[] = [];
  for (const e of employees) {
    const node = nodeById.get(e.id)!;
    const manager = e.managerId ? nodeById.get(e.managerId) : undefined;
    if (manager) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Network}
        title="Estrutura Organizacional"
        description="Organograma — árvore de reporte (chefia direta)."
      />

      <EstruturaTabs />

      <Card>
        {roots.length === 0 ? (
          <EmptyState message="Sem colaboradores ativos para representar." />
        ) : (
          <ul className="space-y-1">
            {roots.map((node) => (
              <OrgNode key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function OrgNode({ node, depth }: { node: Node; depth: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg py-1.5"
        style={{ marginLeft: depth * 24 }}
      >
        {depth > 0 && <span className="h-px w-4 shrink-0 bg-stone-300 dark:bg-stone-700" />}
        <Link
          href={`/colaboradores/${node.id}`}
          className="font-medium text-violet-700 hover:underline dark:text-violet-400"
        >
          {node.firstName} {node.lastName}
        </Link>
        <span className="text-xs text-stone-500 dark:text-stone-400">{node.jobTitle}</span>
        {node.departmentName && <Badge color="slate">{node.departmentName}</Badge>}
        {node.children.length > 0 && (
          <span className="text-xs text-stone-400">
            ({node.children.length} report{node.children.length > 1 ? "s" : ""})
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
