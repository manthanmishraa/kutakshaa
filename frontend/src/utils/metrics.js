export const DEFAULT_BASELINE = {
  walking_speed: 1.2,
  activity_level: 82,
  sitting_minutes: 48,
  balance_score: 78,
  tremor_index: 12,
  gait_rhythm: 85,
  posture_stability: 82,
  step_stride: 0.72,
  fatigue_index: 18,
  movement_variability: 11,
};

export function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeMetrics(input, fallback = DEFAULT_BASELINE) {
  if (!input || typeof input !== 'object') return { ...fallback };
  return {
    walking_speed: asNumber(input.walking_speed ?? input.walkingSpeed, fallback.walking_speed),
    activity_level: asNumber(input.activity_level ?? input.activity ?? input.activityLevel, fallback.activity_level),
    sitting_minutes: asNumber(input.sitting_minutes ?? input.sitting ?? input.sittingTime, fallback.sitting_minutes),
    balance_score: asNumber(input.balance_score ?? input.balanceScore, fallback.balance_score),
    tremor_index: asNumber(input.tremor_index ?? input.tremorIndex, fallback.tremor_index),
    gait_rhythm: asNumber(input.gait_rhythm ?? input.gaitRhythm, fallback.gait_rhythm),
    posture_stability: asNumber(input.posture_stability ?? input.postureStability, fallback.posture_stability),
    step_stride: asNumber(input.step_stride ?? input.stepStride, fallback.step_stride),
    fatigue_index: asNumber(input.fatigue_index ?? input.fatigueIndex, fallback.fatigue_index),
    movement_variability: asNumber(input.movement_variability ?? input.movementVariability, fallback.movement_variability),
  };
}

export function hsiFromCurrent(current, base) {
  const speedDrop = Math.max(0, (base.walking_speed - current.walking_speed) / base.walking_speed);
  const activityDrop = Math.max(0, (base.activity_level - current.activity_level) / base.activity_level);
  const balanceDrop = Math.max(0, (base.balance_score - current.balance_score) / base.balance_score);
  const tremorRise = Math.max(0, (current.tremor_index - base.tremor_index) / Math.max(base.tremor_index, 1));
  const postureDrop = Math.max(0, (base.posture_stability - current.posture_stability) / Math.max(base.posture_stability, 1));
  const strideDrop = Math.max(0, (base.step_stride - current.step_stride) / Math.max(base.step_stride, 0.1));
  const fatigueRise = Math.max(0, (current.fatigue_index - base.fatigue_index) / Math.max(base.fatigue_index, 1));
  const varRise = Math.max(0, (current.movement_variability - base.movement_variability) / Math.max(base.movement_variability, 1));
  const score = 100 - speedDrop * 24 - activityDrop * 18 - balanceDrop * 14 - tremorRise * 12 - postureDrop * 10 - strideDrop * 5 - fatigueRise * 8 - varRise * 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function riskFromCurrent(current, base) {
  let risk = 0;
  if (current.walking_speed < base.walking_speed * 0.85) risk += 20;
  if (current.activity_level < base.activity_level * 0.7) risk += 15;
  if (current.walking_speed < base.walking_speed * 0.75) risk += 10;
  if (current.balance_score < base.balance_score * 0.8) risk += 15;
  if (current.tremor_index > base.tremor_index * 1.5) risk += 10;
  if (current.posture_stability < base.posture_stability * 0.85) risk += 8;
  if (current.step_stride < base.step_stride * 0.82) risk += 8;
  if (current.fatigue_index > base.fatigue_index * 1.5) risk += 8;
  if (current.movement_variability > base.movement_variability * 1.5) risk += 6;
  return Math.min(100, risk);
}

export function severityFromCurrent(current, base) {
  const deviations = [
    { key: 'walking_speed', weight: 18, factor: 1.35 },
    { key: 'activity_level', weight: 14, factor: 1.0 },
    { key: 'balance_score', weight: 14, factor: 1.0 },
    { key: 'tremor_index', weight: 10, factor: 1.15 },
    { key: 'gait_rhythm', weight: 8, factor: 1.0 },
    { key: 'posture_stability', weight: 8, factor: 1.0 },
    { key: 'step_stride', weight: 5, factor: 1.18 },
    { key: 'fatigue_index', weight: 3, factor: 1.0 },
    { key: 'movement_variability', weight: 2, factor: 1.0 },
  ];

  let score = 0;
  for (const metric of deviations) {
    const curr = current[metric.key];
    const bl = base[metric.key];
    if (bl === 0) continue;
    const delta = Math.abs(curr - bl) / Math.max(bl, 1);
    const normalized = Math.min(1, delta * metric.factor);
    score += normalized * metric.weight;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function metricChange(current, base) {
  if (base === 0) return 0;
  return Math.round(((current - base) / base) * 100);
}

export function deviationPercent(current, base) {
  if (base === 0) return 0;
  return Math.abs((current - base) / base) * 100;
}

export function checkDeviations(current, base, threshold = 20) {
  const alerts = [];
  const metrics = [
    { key: 'walking_speed', label: 'Walking Speed', unit: 'm/s', lowerIsBad: true },
    { key: 'activity_level', label: 'Activity Level', unit: '%', lowerIsBad: true },
    { key: 'balance_score', label: 'Balance Score', unit: '%', lowerIsBad: true },
    { key: 'tremor_index', label: 'Tremor Index', unit: '', lowerIsBad: false },
    { key: 'gait_rhythm', label: 'Gait Rhythm', unit: '%', lowerIsBad: true },
    { key: 'posture_stability', label: 'Posture Stability', unit: '%', lowerIsBad: true },
    { key: 'step_stride', label: 'Step Stride', unit: 'm', lowerIsBad: true },
    { key: 'fatigue_index', label: 'Fatigue Index', unit: '', lowerIsBad: false },
    { key: 'movement_variability', label: 'Movement Variability', unit: '', lowerIsBad: false },
  ];

  for (const m of metrics) {
    const curr = current[m.key];
    const bl = base[m.key];
    const dev = deviationPercent(curr, bl);
    if (dev >= threshold) {
      const direction = curr > bl ? 'above' : 'below';
      const severity = dev >= 40 ? 'critical' : dev >= 30 ? 'warning' : 'caution';
      alerts.push({
        metric: m.key,
        label: m.label,
        current: curr,
        baseline: bl,
        deviation: Math.round(dev),
        direction,
        severity,
        unit: m.unit,
        message: `${m.label} is ${Math.round(dev)}% ${direction} baseline (${curr}${m.unit ? ' ' + m.unit : ''} vs ${bl}${m.unit ? ' ' + m.unit : ''})`,
      });
    }
  }
  return alerts;
}

export function sustainedDeviations(history, base, threshold = 20, minSamples = 4) {
  if (!Array.isArray(history) || history.length < minSamples) return [];

  const recent = history.slice(-minSamples);
  const alerts = [];
  const metrics = [
    { key: 'walking_speed', label: 'Walking Speed', unit: 'm/s' },
    { key: 'activity_level', label: 'Activity Level', unit: '%' },
    { key: 'balance_score', label: 'Balance Score', unit: '%' },
    { key: 'tremor_index', label: 'Tremor Index', unit: '' },
    { key: 'gait_rhythm', label: 'Gait Rhythm', unit: '%' },
    { key: 'posture_stability', label: 'Posture Stability', unit: '%' },
    { key: 'step_stride', label: 'Step Stride', unit: 'm' },
    { key: 'fatigue_index', label: 'Fatigue Index', unit: '' },
    { key: 'movement_variability', label: 'Movement Variability', unit: '' },
  ];

  for (const m of metrics) {
    const deviations = recent.map((sample) => deviationPercent(sample[m.key], base[m.key]));
    const badCount = deviations.filter((dev) => dev >= threshold).length;
    if (badCount < Math.ceil(minSamples * 0.75)) continue;

    const latest = recent[recent.length - 1][m.key];
    const baselineValue = base[m.key];
    const dev = deviationPercent(latest, baselineValue);
    const direction = latest > baselineValue ? 'above' : 'below';
    const severity = dev >= 40 ? 'critical' : dev >= 30 ? 'warning' : 'caution';

    alerts.push({
      metric: m.key,
      label: m.label,
      current: latest,
      baseline: baselineValue,
      deviation: Math.round(dev),
      direction,
      severity,
      unit: m.unit,
      message: `${m.label} is ${Math.round(dev)}% ${direction} baseline (${latest}${m.unit ? ' ' + m.unit : ''} vs ${baselineValue}${m.unit ? ' ' + m.unit : ''})`,
    });
  }

  return alerts;
}

export function riskLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function trendLabel(change, reverse = false) {
  const good = reverse ? change > 0 : change < 0;
  return good ? 'text-emerald-600' : 'text-rose-600';
}

export const METRIC_LABELS = {
  walking_speed: { label: 'Walking Speed', unit: 'm/s', decimals: 2 },
  activity_level: { label: 'Activity Level', unit: '%', decimals: 0 },
  balance_score: { label: 'Balance Score', unit: '%', decimals: 0 },
  tremor_index: { label: 'Tremor Index', unit: '', decimals: 1 },
  gait_rhythm: { label: 'Gait Rhythm', unit: '%', decimals: 0 },
  posture_stability: { label: 'Posture Stability', unit: '%', decimals: 0 },
  step_stride: { label: 'Step Stride', unit: 'm', decimals: 2 },
  fatigue_index: { label: 'Fatigue Index', unit: '', decimals: 0 },
  movement_variability: { label: 'Movement Variability', unit: '', decimals: 1 },
};
