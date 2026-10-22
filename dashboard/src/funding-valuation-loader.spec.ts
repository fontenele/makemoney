import { describe, expect, it, vi } from 'vitest';

import { createFundingValuationLoader } from './funding-valuation-loader';

describe('createFundingValuationLoader', () => {
  it('loads once on initialization and only loads again through manual reload', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('initial')
      .mockResolvedValueOnce('manual');
    const publish = vi.fn();
    const setLoading = vi.fn();
    const loader = createFundingValuationLoader({
      load,
      publish,
      setLoading,
    });

    await loader.loadInitial();
    await loader.loadInitial();
    expect(load).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenLastCalledWith('initial');

    await loader.reload();
    expect(load).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenLastCalledWith('manual');
    expect(setLoading.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it('coalesces overlapping initial and manual requests', async () => {
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((resolver) => {
      resolve = resolver;
    });
    const load = vi.fn(() => pending);
    const publish = vi.fn();
    const loader = createFundingValuationLoader({
      load,
      publish,
      setLoading: vi.fn(),
    });

    const initial = loader.loadInitial();
    const reload = loader.reload();
    expect(load).toHaveBeenCalledTimes(1);
    resolve('value');
    await Promise.all([initial, reload]);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
