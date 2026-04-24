function toSafeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function normalizeOptions(rawOptions) {
  if (Array.isArray(rawOptions)) {
    return rawOptions.map(option => toSafeString(option)).filter(Boolean);
  }
  if (typeof rawOptions !== 'string') return [];

  const trimmed = rawOptions.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(option => toSafeString(option)).filter(Boolean);
    }
  } catch {
    return trimmed.split('\n').map(option => option.trim()).filter(Boolean);
  }

  return [];
}

function normalizeVoteCounts(rawVoteCounts, size) {
  const counts = Array.isArray(rawVoteCounts) ? rawVoteCounts : [];
  return Array.from({ length: size }, (_, index) => {
    const value = Number(counts[index]);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  });
}

export function normalizeSurvey(rawSurvey, index) {
  const source = rawSurvey && typeof rawSurvey === 'object' ? rawSurvey : {};
  const surveyId = source.id ?? null;
  const optionLabels = normalizeOptions(source.options);
  const fallbackCount = Array.isArray(source.vote_counts) ? source.vote_counts.length : 0;
  const optionCount = optionLabels.length || fallbackCount || 1;
  const options = optionLabels.length
    ? optionLabels
    : Array.from({ length: optionCount }, (_, optionIndex) => `Варіант ${optionIndex + 1}`);
  const voteCounts = normalizeVoteCounts(source.vote_counts, options.length);
  const votesFromOptions = voteCounts.reduce((sum, count) => sum + count, 0);
  const totalValue = Number(source.total_votes);
  const totalVotes = Number.isFinite(totalValue) && totalValue >= 0 ? Math.floor(totalValue) : votesFromOptions;

  return {
    key: surveyId === null ? `survey-${index}` : String(surveyId),
    id: surveyId,
    title: toSafeString(source.title, 'Без назви'),
    question: toSafeString(source.question, 'Питання не вказано.'),
    options,
    voteCounts,
    totalVotes,
    active: Boolean(source.active),
  };
}
