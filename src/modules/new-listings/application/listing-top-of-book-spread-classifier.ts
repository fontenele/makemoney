import Decimal from 'decimal.js';
import {
  ListingTopOfBookSpreadClassification,
  ListingTopOfBookSpreadClassificationEvent,
  ListingTopOfBookSpreadThresholds,
} from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';

const ClassificationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const CANONICAL_SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;

export class ListingTopOfBookSpreadClassifier {
  classify(
    evolution: ListingTopOfBookSpreadEvolution,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): ListingTopOfBookSpreadClassification {
    const wideningThreshold = parseThreshold(thresholds.wideningBasisPoints);
    validateEvolution(evolution);

    let widening: ListingTopOfBookSpreadClassificationEvent | null = null;
    let maximum = evolution.points[0];
    let maximumChange = new ClassificationDecimal(
      maximum.spreadBasisPointsChange,
    );
    for (const point of evolution.points) {
      const change = new ClassificationDecimal(point.spreadBasisPointsChange);
      if (change.greaterThan(maximumChange)) {
        maximum = point;
        maximumChange = change;
      }
      if (!widening && change.greaterThanOrEqualTo(wideningThreshold)) {
        widening = event(point);
      }
    }

    return {
      provider: evolution.provider,
      symbol: evolution.symbol,
      status: widening ? 'widening-observed' : 'no-widening-observed',
      thresholds,
      evaluatedThroughLabel: evolution.points.at(-1)!.label,
      widening,
      maximumWidening: event(maximum),
    };
  }
}

export function validateListingTopOfBookSpreadThresholds(
  thresholds: ListingTopOfBookSpreadThresholds,
): void {
  parseThreshold(thresholds.wideningBasisPoints);
}

function parseThreshold(
  value: string,
): InstanceType<typeof ClassificationDecimal> {
  let threshold: InstanceType<typeof ClassificationDecimal>;
  try {
    threshold = new ClassificationDecimal(value);
  } catch {
    throw new Error('Spread widening threshold must be a positive decimal');
  }
  if (!threshold.isFinite() || !threshold.greaterThan(0)) {
    throw new Error('Spread widening threshold must be a positive decimal');
  }
  return threshold;
}

function validateEvolution(evolution: ListingTopOfBookSpreadEvolution): void {
  let baseline: InstanceType<typeof ClassificationDecimal>;
  try {
    baseline = new ClassificationDecimal(evolution.baselineSpreadBasisPoints);
  } catch {
    throw new Error('Listing top-of-book spread evolution is invalid');
  }
  if (
    evolution.provider !== 'binance' ||
    !CANONICAL_SYMBOL_PATTERN.test(evolution.symbol) ||
    evolution.baselineLabel !== 'T+0' ||
    !baseline.isFinite() ||
    baseline.isNegative() ||
    evolution.points.length === 0
  ) {
    throw new Error('Listing top-of-book spread evolution is invalid');
  }

  const labels = new Set<string>();
  let priorOffset = -1;
  for (const point of evolution.points) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === point.label,
    );
    let spread: InstanceType<typeof ClassificationDecimal>;
    let change: InstanceType<typeof ClassificationDecimal>;
    try {
      spread = new ClassificationDecimal(point.spreadBasisPoints);
      change = new ClassificationDecimal(point.spreadBasisPointsChange);
    } catch {
      throw new Error('Listing top-of-book spread evolution point is invalid');
    }
    if (
      !schedule ||
      schedule.offsetMs !== point.offsetMs ||
      point.offsetMs <= priorOffset ||
      labels.has(point.label) ||
      !Number.isFinite(point.targetAt.getTime()) ||
      !spread.isFinite() ||
      spread.isNegative() ||
      !change.isFinite() ||
      !spread.minus(baseline).equals(change)
    ) {
      throw new Error('Listing top-of-book spread evolution point is invalid');
    }
    labels.add(point.label);
    priorOffset = point.offsetMs;
  }
  const first = evolution.points[0];
  if (
    first.label !== 'T+0' ||
    !new ClassificationDecimal(first.spreadBasisPoints).equals(baseline) ||
    !new ClassificationDecimal(first.spreadBasisPointsChange).isZero()
  ) {
    throw new Error('Listing top-of-book spread evolution must start at T+0');
  }
}

function event(
  point: ListingTopOfBookSpreadEvolution['points'][number],
): ListingTopOfBookSpreadClassificationEvent {
  return {
    label: point.label,
    offsetMs: point.offsetMs,
    spreadBasisPoints: point.spreadBasisPoints,
    spreadBasisPointsChange: point.spreadBasisPointsChange,
  };
}
