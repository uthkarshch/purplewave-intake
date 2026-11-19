import type { SubmissionView } from '../../shared/contract';
import type { OutboxPhoto } from './types';

export type TransportErrorKind = 'transient' | 'permanent';

export class TransportError extends Error {
  constructor(
    message: string,
    readonly kind: TransportErrorKind,
    readonly details: { code?: string; retryAfterMs?: number; missing?: string[] } = {},
  ) {
    super(message);
    this.name = 'TransportError';
  }

  get code() {
    return this.details.code;
  }
}

export type CreateBody = {
  categoryId: string;
  schemaVersion: number;
  fields: Record<string, unknown>;
  photos: { id: string; sha256: string; size: number }[];
};

// Implementations own their timeouts and must throw TransportError.
export interface Transport {
  create(idempotencyKey: string, body: CreateBody): Promise<SubmissionView>;
  get(serverId: string): Promise<SubmissionView | null>;
  uploadPhoto(serverId: string, photo: OutboxPhoto): Promise<void>;
  finalize(serverId: string): Promise<SubmissionView>;
}

export interface PhotoFiles {
  exists(uri: string): Promise<boolean>;
  remove(uri: string): Promise<void>;
}
