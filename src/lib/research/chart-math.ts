export interface NumericAxis {
  domain: [number, number];
  domainMax: number;
  ticks: number[];
}

export function getNiceIncrement(max: number, targetIntervals = 6) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const roughIncrement = max / targetIntervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughIncrement)));
  const normalized = roughIncrement / magnitude;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

export function buildLinearAxis(
  values: number[],
  fixedIncrement?: number,
): NumericAxis {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  const increment = fixedIncrement ?? getNiceIncrement(max);
  const domainMax = Math.max(
    increment,
    (Math.floor(max / increment) + 1) * increment,
  );
  const ticks = Array.from(
    { length: Math.round(domainMax / increment) + 1 },
    (_, index) => index * increment,
  );
  return { domain: [0, domainMax], domainMax, ticks };
}

export function buildThroughputAxis(values: number[]): NumericAxis {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  return buildLinearAxis(values, Math.max(50, getNiceIncrement(max)));
}

export function buildEscalatingPriceAxis(values: number[]) {
  const positive = values.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  if (!positive.length) {
    return {
      domain: [0.1, 10] as [number, number],
      domainMax: 10,
      ticks: [0.1, 0.2, 0.5, 1, 2, 5, 10],
    };
  }

  const min = Math.min(...positive);
  const max = Math.max(...positive);
  const minExponent = Math.floor(Math.log10(min)) - 1;
  const maxExponent = Math.ceil(Math.log10(max)) + 1;
  const candidates: number[] = [];

  for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
    const magnitude = Math.pow(10, exponent);
    for (const multiplier of [1, 2, 5]) {
      candidates.push(multiplier * magnitude);
    }
  }

  const domainMin =
    [...candidates].reverse().find((candidate) => candidate < min) ?? min / 2;
  const domainMax = candidates.find((candidate) => candidate > max) ?? max * 2;

  return {
    domain: [domainMin, domainMax] as [number, number],
    domainMax,
    ticks: candidates.filter(
      (candidate) => candidate >= domainMin && candidate <= domainMax,
    ),
  };
}
