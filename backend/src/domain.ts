import type { ContainerReport, DamageDetail } from '@prisma/client';
import type { CreateReportInput, Period, ReportsQuery } from './schemas.js';

export type Report = ContainerReport & { damages: DamageDetail[] };
export interface Stats {
  period: Period;
  start: string;
  end: string;
  total_scanned: number;
  total_damaged: number;
  damage_rate: number;
  damage_counts: { type: string; count: number }[];
  timeline: { date: string; scanned: number; damaged: number }[];
}
export interface ReportPage {
  data: Report[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}
export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  list(query: ReportsQuery): Promise<ReportPage>;
  stats(period: Period): Promise<Stats>;
  damagedThisMonth(): Promise<Report[]>;
  health(): Promise<void>;
}
export type AlertStatus = 'accepted' | 'failed' | 'disabled' | 'not_required';
export interface AlertResult {
  status: AlertStatus;
  accepted: number;
  failed: number;
}
export interface AlertService {
  send(report: Report): Promise<AlertResult>;
}
