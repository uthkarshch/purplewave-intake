import express from 'express';
import multer from 'multer';

import { createChaos } from './chaos';

export type NaiveSubmission = {
  id: string;
  fields: Record<string, unknown>;
  photoCount: number;
};

export function createApp(options: { seed?: number } = {}) {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  const chaos = createChaos(options.seed);
  const submissions: NaiveSubmission[] = [];

  // Control endpoints sit before the chaos middleware so faults never hit them.
  app.post('/__chaos', express.json(), (req, res) => {
    try {
      chaos.configure(req.body);
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.get('/__debug/submissions', (_req, res) => {
    res.json(submissions);
  });

  app.use(chaos.middleware);

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

  return app;
}
