const DEFAULT_PAGE_SIZE = 1000;

export async function fetchAllRows(buildQuery, pageSize = DEFAULT_PAGE_SIZE) {
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };

    rows.push(...data);
    if (data.length < pageSize) return { data: rows, error: null };
  }
}
