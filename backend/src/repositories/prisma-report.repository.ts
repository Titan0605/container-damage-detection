import { Prisma, type PrismaClient } from '@prisma/client';
import type { ReportRepository, Stats } from '../domain.js';
import type { CreateReportInput, Period, ReportsQuery } from '../schemas.js';
import { dateKey, DAY_MS, monthRange, periodRange } from '../utils/dates.js';

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  create(input: CreateReportInput) {
    return this.db.containerReport.create({
      data: {
        serial_number: input.serial_number,
        image_url: input.image_url,
        damages: {
          create: input.damages.map((damage) => ({
            damage_type: damage.type,
            confidence: damage.confidence,
          })),
        },
      },
      include: { damages: true },
    });
  }

  async list(query: ReportsQuery) {
    const range = query.period ? periodRange(query.period) : undefined;
    const where: Prisma.ContainerReportWhereInput = {
      ...(query.search ? { serial_number: query.search } : {}),
      ...(range ? { timestamp: { gte: range.start, lte: range.end } } : {}),
    };
    const [data, total] = await this.db.$transaction(
      [
        this.db.containerReport.findMany({
          where,
          include: { damages: true },
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.db.containerReport.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async stats(period: Period): Promise<Stats> {
    const { start, end } = periodRange(period);
    const where = { timestamp: { gte: start, lte: end } };
    const [total_scanned, total_damaged, groups, daily] = await this.db.$transaction(
      [
        this.db.containerReport.count({ where }),
        this.db.containerReport.count({ where: { ...where, damages: { some: {} } } }),
        this.db.$queryRaw<{ damage_type: string; count: bigint }[]>(Prisma.sql`
        SELECT d.damage_type, count(*) AS count FROM "DamageDetail" d
        JOIN "ContainerReport" r ON r.id = d.report_id
        WHERE r."timestamp" >= ${start} AND r."timestamp" <= ${end}
        GROUP BY d.damage_type
      `),
        this.db.$queryRaw<{ date: string; scanned: bigint; damaged: bigint }[]>(Prisma.sql`
        SELECT to_char(r."timestamp" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          count(*) AS scanned,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "DamageDetail" d WHERE d.report_id = r.id)) AS damaged
        FROM "ContainerReport" r WHERE r."timestamp" >= ${start} AND r."timestamp" <= ${end}
        GROUP BY 1 ORDER BY 1
      `),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const days = new Map(daily.map((day) => [day.date, day]));
    const timeline: Stats['timeline'] = [];
    for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
      const date = dateKey(new Date(time));
      const day = days.get(date);
      timeline.push({
        date,
        scanned: Number(day?.scanned ?? 0),
        damaged: Number(day?.damaged ?? 0),
      });
    }
    return {
      period,
      start: start.toISOString(),
      end: end.toISOString(),
      total_scanned,
      total_damaged,
      damage_rate:
        total_scanned === 0 ? 0 : Math.round((total_damaged / total_scanned) * 10000) / 100,
      damage_counts: ['hole', 'rust', 'dent'].map((type) => ({
        type,
        count: Number(groups.find((group) => group.damage_type === type)?.count ?? 0),
      })),
      timeline,
    };
  }

  damagedThisMonth() {
    const { start, end } = monthRange();
    return this.db.containerReport.findMany({
      where: { timestamp: { gte: start, lt: end }, damages: { some: {} } },
      include: { damages: true },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    });
  }
  async health() {
    await this.db.$queryRaw`SELECT 1`;
  }
}
