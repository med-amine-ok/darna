// Utility functions to serialize filter state to and from URL query strings
export function serializeFiltersToQuery(filters: Record<string, any>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "" || val === "all") return;
    if (Array.isArray(val)) {
      if (val.length > 0) params.set(key, val.join(","));
    } else {
      params.set(key, String(val));
    }
  });

  return params.toString();
}

export function parseFiltersFromQuery(searchParams: URLSearchParams): Record<string, any> {
  const result: Record<string, any> = {};

  searchParams.forEach((val, key) => {
    if (!val) return;
    if (val.includes(",")) {
      result[key] = val.split(",");
    } else if (val === "true") {
      result[key] = true;
    } else if (val === "false") {
      result[key] = false;
    } else if (!isNaN(Number(val)) && key !== "wilayaCode") {
      result[key] = Number(val);
    } else {
      result[key] = val;
    }
  });

  return result;
}
