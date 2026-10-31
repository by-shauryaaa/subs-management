/** Prisma `skip`/`take` for a 1-based page. */
export function pageArgs(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Parses `sort=field:dir` against an allow-list; anything else falls back.
 * Returns `[field, direction]`.
 */
export function parseSort<F extends string>(
  sort: string | undefined,
  allowed: readonly F[],
  fallback: [F, 'asc' | 'desc'],
): [F, 'asc' | 'desc'] {
  const [field, direction] = (sort ?? '').split(':');
  const match = allowed.find((name) => name === field);
  return match && (direction === 'asc' || direction === 'desc')
    ? [match, direction]
    : fallback;
}
