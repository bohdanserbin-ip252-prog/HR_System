export const STAGES = [
  { key: 'new', label: 'Нові', color: '#6b7280' },
  { key: 'screening', label: 'Скринінг', color: '#d97706' },
  { key: 'interview', label: 'Інтервʼю', color: '#2563eb' },
  { key: 'offer', label: 'Офер', color: '#7c3aed' },
  { key: 'hired', label: 'Найняті', color: '#059669' },
  { key: 'rejected', label: 'Відхилені', color: '#dc2626' },
];

export const STAGE_INDEX_BY_KEY = STAGES.reduce((acc, stage, index) => {
  acc[stage.key] = index;
  return acc;
}, {});

export function toOptionalString(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

export function toOptionalRating(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
