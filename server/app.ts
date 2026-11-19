import express from 'express';
import multer from 'multer';

export type NaiveSubmission = {
  id: string;
  fields: Record<string, unknown>;
  photoCount: number;
};

export function createApp() {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  const submissions: NaiveSubmission[] = [];

  // v0: single multipart request carrying metadata and every photo, no idempotency.
  app.post('/v0/submissions', upload.array('photos'), (req, res) => {
    const fields = JSON.parse(String(req.body.payload ?? '{}'));
    const submission: NaiveSubmission = {
      id: `sub_${submissions.length + 1}`,
      fields,
      photoCount: (req.files as Express.Multer.File[] | undefined)?.length ?? 0,
    };
    submissions.push(submission);
    res.status(201).json({ id: submission.id });
  });

  app.get('/__debug/submissions', (_req, res) => {
    res.json(submissions);
  });

  return app;
}
