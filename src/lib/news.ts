import { prisma } from "@/lib/prisma";

export async function getVisibleNews(roles: string[], limit = 8) {
  return prisma.news.findMany({
    where: {
      OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { hasSome: roles } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { name: true } } },
  });
}
