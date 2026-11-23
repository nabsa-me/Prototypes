import type { ReportCategory, ReportStatus } from '@fita/contracts';
import type { BadgeTone } from '../../design-system/Badge.svelte';

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  toponym: 'Topònim',
  road: 'Via o carretera',
  building: 'Edifici',
  boundary: 'Límit administratiu',
  other: 'Altres',
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Oberta',
  in_review: 'En revisió',
  resolved: 'Resolta',
  dismissed: 'Descartada',
};

export const STATUS_TONE: Record<ReportStatus, BadgeTone> = {
  open: 'warning',
  in_review: 'info',
  resolved: 'success',
  dismissed: 'neutral',
};

const dateTime = new Intl.DateTimeFormat('ca', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
});

/** A stored ISO timestamp shown in Catalan, in Catalonia's time zone. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
