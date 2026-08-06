import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { AvatarImage } from "@/lib/avatars";
import { EstruturaTabs } from "../tabs";
import Link from "next/link";
import { Network } from "lucide-react";

type Node = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentName: string | null;
  avatarKey: string | null;
  avatarImage: string | null;
  children: Node[];
};

const LEVEL_ACCENTS = [
  { grad: "from-teal-600 to-cyan-400", tag: "bg-gradient-to-r from-teal-600 to-cyan-500" },
  { grad: "from-emerald-600 to-lime-400", tag: "bg-gradient-to-r from-emerald-600 to-lime-500" },
  { grad: "from-amber-500 to-yellow-400", tag: "bg-gradient-to-r from-amber-500 to-yellow-400" },
  { grad: "from-orange-600 to-amber-400", tag: "bg-gradient-to-r from-orange-600 to-amber-500" },
  { grad: "from-violet-600 to-fuchsia-400", tag: "bg-gradient-to-r from-violet-600 to-fuchsia-500" },
  { grad: "from-sky-600 to-cyan-400", tag: "bg-gradient-to-r from-sky-600 to-cyan-500" },
];

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
      user: { select: { avatarKey: true, avatarImage: true } },
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
        avatarKey: e.user?.avatarKey ?? null,
        avatarImage: e.user?.avatarImage ?? null,
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
        description="Organograma — árvore de reporte (chefia direta), com departamento e função de cada colaborador."
      />

      <EstruturaTabs />

      <Card className="overflow-hidden p-0">
        {roots.length === 0 ? (
          <EmptyState message="Sem colaboradores ativos para representar." />
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex justify-center gap-12 p-6" style={{ minWidth: "100%", width: "max-content" }}>
              {roots.map((node) => (
                <OrgNode key={node.id} node={node} depth={0} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function OrgCard({ node, depth }: { node: Node; depth: number }) {
  const name = `${node.firstName} ${node.lastName}`;
  const accent = LEVEL_ACCENTS[depth % LEVEL_ACCENTS.length];

  return (
    <Link
      href={`/colaboradores/${node.id}`}
      className="relative flex w-[240px] items-center gap-3 rounded-full border border-stone-200 bg-white py-1.5 pr-4 pl-1.5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
    >
      {node.departmentName && (
        <span
          className={`absolute -top-2.5 right-3 max-w-[85%] truncate rounded px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow ${accent.tag}`}
        >
          {node.departmentName}
        </span>
      )}
      <span className={`shrink-0 rounded-full bg-gradient-to-br p-[3px] shadow-md ${accent.grad}`}>
        <span className="block rounded-full bg-white p-[2px] dark:bg-stone-900">
          <AvatarImage avatarKey={node.avatarKey} avatarImage={node.avatarImage} name={name} size={48} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{name}</span>
        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{node.jobTitle}</span>
      </span>
    </Link>
  );
}

function OrgNode({ node, depth }: { node: Node; depth: number }) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <OrgCard node={node} depth={depth} />
      {hasChildren && (
        <>
          <span className="h-6 w-px bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-start">
            {node.children.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center px-4">
                {node.children.length > 1 && (
                  <span
                    className="absolute top-0 h-px bg-stone-300 dark:bg-stone-700"
                    style={{
                      left: i === 0 ? "50%" : 0,
                      right: i === node.children.length - 1 ? "50%" : 0,
                    }}
                  />
                )}
                <span className="h-6 w-px bg-stone-300 dark:bg-stone-700" />
                <OrgNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
