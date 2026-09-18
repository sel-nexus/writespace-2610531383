import { useCallback, useEffect, useState } from 'react';

/** Load a remote resource with explicit retry and non-destructive refresh failures. */
export default function useRemoteResource(loader) {
  const [state, setState] = useState({ data: null, phase: 'loading', error: null });

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      phase: current.data === null ? 'loading' : 'refreshing',
      error: null,
    }));

    try {
      const data = await loader();
      setState({ data, phase: 'ready', error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: current.data === null ? 'error' : 'ready',
        error,
      }));
    }
  }, [loader]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, retry: load };
}
