export type PhotoManifestEntry = {
  id: string;
  sha256: string;
  size: number;
};

export type CreateSubmissionBody = {
  categoryId: string;
  schemaVersion: number;
  fields: Record<string, unknown>;
  photos: PhotoManifestEntry[];
};

export type SubmissionStatus = 'created' | 'finalized';

export type SubmissionView = {
  id: string;
  status: SubmissionStatus;
  categoryId: string;
  schemaVersion: number;
  fields: Record<string, unknown>;
  photos: PhotoManifestEntry[];
  receivedPhotoIds: string[];
};

export type ApiErrorCode =
  | 'missing_idempotency_key'
  | 'invalid_body'
  | 'idempotency_key_reuse'
  | 'unknown_photo'
  | 'checksum_mismatch'
  | 'missing_photos'
  | 'unknown_category'
  | 'validation_failed';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  missing?: string[];
  errors?: { field: string; message: string }[];
};
