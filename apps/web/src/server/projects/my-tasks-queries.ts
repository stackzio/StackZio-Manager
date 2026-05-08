import { prisma } from "@stackzio/db";
import { requireOrg } from "@/server/auth/guards";

export interface MyTasksData {
  byStatus: {
    TODO: MyTaskRow[];
    DOING: MyTaskRow[];
    DONE: MyTaskRow[];
  };
  counts: {
    total: number;
    todo: number;
    doing: number;
    done: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  };
}

export interface MyTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "DOING" | "DONE";
  dueDate: Date | null;
  completedAt: Date | null;
  project: { id: string; name: string };
}

export async function getMyTasks(): Promise<MyTasksData> {
  const { org, user } = await requireOrg();

  const tasks = await prisma.task.findMany({
    where: { organizationId: org.id, assigneeId: user.id },
    orderBy: [
      { status: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: { project: { select: { id: true, name: true } } },
  });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const endOfWeek = new Date(startOfDay);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const byStatus = {
    TODO: [] as MyTaskRow[],
    DOING: [] as MyTaskRow[],
    DONE: [] as MyTaskRow[],
  };
  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;

  for (const t of tasks) {
    const row: MyTaskRow = {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      project: t.project,
    };
    byStatus[t.status].push(row);

    if (t.status !== "DONE" && t.dueDate) {
      if (t.dueDate < startOfDay) overdue += 1;
      else if (t.dueDate < endOfDay) dueToday += 1;
      else if (t.dueDate < endOfWeek) dueThisWeek += 1;
    }
  }

  return {
    byStatus,
    counts: {
      total: tasks.length,
      todo: byStatus.TODO.length,
      doing: byStatus.DOING.length,
      done: byStatus.DONE.length,
      overdue,
      dueToday,
      dueThisWeek,
    },
  };
}
