export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
    },
  };
}

export function toPrismaOrderBy(
  sort?: string,
): Record<string, 'asc' | 'desc'> | undefined {
  if (!sort) {
    return undefined;
  }
  const [field, direction] = sort.split(':');
  if (!field || (direction !== 'asc' && direction !== 'desc')) {
    return undefined;
  }
  return { [field]: direction };
}
