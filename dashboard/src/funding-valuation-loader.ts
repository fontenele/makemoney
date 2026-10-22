export interface FundingValuationLoaderOptions<T> {
  readonly load: () => Promise<T>;
  readonly publish: (value: T) => void;
  readonly setLoading: (loading: boolean) => void;
}

export interface FundingValuationLoader {
  readonly loadInitial: () => Promise<void>;
  readonly reload: () => Promise<void>;
}

export function createFundingValuationLoader<T>(
  options: FundingValuationLoaderOptions<T>,
): FundingValuationLoader {
  let initialLoadStarted = false;
  let inFlight: Promise<void> | null = null;

  const run = (): Promise<void> => {
    if (inFlight !== null) return inFlight;
    options.setLoading(true);
    const operation = options
      .load()
      .then((value) => options.publish(value))
      .finally(() => {
        options.setLoading(false);
        if (inFlight === operation) inFlight = null;
      });
    inFlight = operation;
    return operation;
  };

  return {
    loadInitial: () => {
      if (initialLoadStarted) return inFlight ?? Promise.resolve();
      initialLoadStarted = true;
      return run();
    },
    reload: run,
  };
}
