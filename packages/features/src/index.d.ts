export type ConvertStatus = 'idle' | 'queued' | 'converting' | 'done' | 'error';

export interface ConvertState {
  status: ConvertStatus;
  files?: unknown[];
  done?: number;
  total?: number;
  outputs?: unknown[];
  error?: string;
  recoverable?: boolean;
}

export interface ConvertEvent {
  type: 'ADD_FILES' | 'START' | 'PROGRESS' | 'FILE_DONE' | 'ALL_DONE' | 'FAIL' | 'RESET';
  files?: unknown[];
  done?: number;
  total?: number;
  output?: unknown;
  outputs?: unknown[];
  error?: string;
  recoverable?: boolean;
}

export const initialState: ConvertState;
export function reduce(state: ConvertState, event: ConvertEvent): ConvertState;

export class BatchManager {
  constructor(options?: { concurrency?: number; convertFn?: (item: unknown, opts?: unknown) => Promise<unknown> });
  add(items: Array<{ id: string; file: Buffer | Uint8Array | string; options?: object; name?: string }>): void;
  process(callbacks?: { onProgress?: (info: unknown) => void }): Promise<{ results: unknown[]; errors: unknown[]; total: number }>;
}

export class CleanService {
  static inspect(buffer: Buffer | Uint8Array): unknown;
  static certify(output: Buffer | Uint8Array): unknown;
  static verifyTransparency(output: Buffer | Uint8Array): Promise<unknown>;
}

export class MultiplierService {
  static parse(scaleInput?: number[] | string): number[];
  static plan(params: { filename: string; baseWidth: number; baseHeight?: number; scales?: number[]; format?: string }): {
    variants: Array<{ scale: number; suffix: string; width?: number; height?: number; filename: string }>;
    srcset: string;
  };
}
