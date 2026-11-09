import type { StorageAdapter } from '../types';

export function neocitiesAdapter(opts: {
  user: string;
  password: string;
  site?: string;
}): StorageAdapter;
