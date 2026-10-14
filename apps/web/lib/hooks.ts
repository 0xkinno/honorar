'use client';

import { useEffect, useState } from 'react';
import { createArcClient } from '@honorar/chain';
import { getJson, type AgentConfig } from './api';

export function useFetch<T>(path: string | null, refreshMs = 0): { data: T | null; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: path !== null });
  useEffect(() => {
    if (path === null) return;
    let live = true;
    const run = (): void => {
      getJson<T>(path)
        .then((d) => live && setState({ data: d, error: null, loading: false }))
        .catch((e: unknown) => live && setState((s) => ({ ...s, error: (e as Error).message, loading: false })));
    };
    run();
    const t = refreshMs > 0 ? setInterval(run, refreshMs) : null;
    return () => {
      live = false;
      if (t) clearInterval(t);
    };
  }, [path, refreshMs]);
  return state;
}

export const useAgentConfig = (): ReturnType<typeof useFetch<AgentConfig>> => useFetch<AgentConfig>('/config');

let client: ReturnType<typeof createArcClient> | null = null;
export function arcClient(): ReturnType<typeof createArcClient> {
  client ??= createArcClient(process.env.NEXT_PUBLIC_ARC_RPC_URL);
  return client;
}
