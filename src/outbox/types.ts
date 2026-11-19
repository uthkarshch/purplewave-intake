export type Phase = 'queued' | 'creating' | 'uploading' | 'finalizing' | 'submitted' | 'needs-attention';

export type OutboxPhoto = {
  id: string;
  uri: string;
  sha256: string;
  size: number;
  uploaded: boolean;
  checksumFailures: number;
};

export type OutboxRecord = {
  // Minted when the form opens; doubles as the server idempotency key.
  id: string;
  categoryId: string;
  schemaVersion: number;
  fields: Record<string, unknown>;
  photos: OutboxPhoto[];
  createdAt: number;
  phase: Phase;
  serverId?: string;
  // Consecutive failed attempts; reset by any step that succeeds.
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  attentionReason?: string;
};

export type EnqueueInput = {
  id: string;
  categoryId: string;
  schemaVersion: number;
  fields: Record<string, unknown>;
  photos: { id: string; uri: string; sha256: string; size: number }[];
};

export const IN_FLIGHT_PHASES: Phase[] = ['creating', 'uploading', 'finalizing'];
