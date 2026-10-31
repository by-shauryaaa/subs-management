import { useSearchParams } from 'react-router-dom';

export function useTableParams() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') ?? 1);
  const rawSize = Number(params.get('pageSize') ?? 25);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = [25, 50, 100].includes(rawSize) ? rawSize : 25;
  const sort = params.get('sort') ?? '';
  const q = params.get('q') ?? '';
  function update(values: Record<string, string | number | null>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    });
  }
  return { page, pageSize, sort, q, params, update };
}
