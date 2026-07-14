import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No existe la ruta ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.requestId;
  if (error instanceof ZodError) {
    res.status(422).type('application/problem+json').json({
      type: 'https://linaquirama.app/problems/validation',
      title: 'Datos inválidos',
      status: 422,
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      requestId,
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).type('application/problem+json').json({
      type: `https://linaquirama.app/problems/${error.code.toLowerCase().replaceAll('_', '-')}`,
      title: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
      requestId,
    });
    return;
  }
  console.error(JSON.stringify({ level: 'error', requestId, message: error instanceof Error ? error.message : 'Unknown error' }));
  res.status(500).type('application/problem+json').json({
    type: 'https://linaquirama.app/problems/internal',
    title: 'No pudimos completar la operación',
    status: 500,
    code: 'INTERNAL_ERROR',
    requestId,
  });
};
