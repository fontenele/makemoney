export function polymarketHistoricalAlignmentLabel(
  sameObservedTimestamp: boolean,
  sameResolution: boolean,
): string {
  if (sameObservedTimestamp && sameResolution) {
    return 'Same time and resolution';
  }
  if (sameObservedTimestamp) return 'Same time, different resolution';
  if (sameResolution) return 'Different times, same resolution';
  return 'Different times and resolutions';
}
