import { NextResponse } from 'next/server';

export function jsonError(
  message: string,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === 'UNAUTHORIZED';
}

export async function parseJsonBody<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
