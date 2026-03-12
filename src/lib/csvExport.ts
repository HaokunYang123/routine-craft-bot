type CsvColumn = {
  key: string;
  label: string;
};

/**
 * Converts an array of objects to a CSV string and triggers a browser download.
 *
 * @param data - Array of flat objects (each object = one row)
 * @param filename - Download filename (should end in .csv)
 * @param columns - Optional column config: { key: string, label: string }[]
 *                  If omitted, uses Object.keys from the first row as both key and label.
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string,
  columns?: CsvColumn[],
): void {
  if (!data || data.length === 0 || typeof document === "undefined") {
    return;
  }

  const cols = columns ?? Object.keys(data[0]).map((key) => ({ key, label: key }));
  const header = cols.map((column) => escapeCsvField(String(column.label))).join(",");
  const rows = data.map((row) =>
    cols.map((column) => escapeCsvField(String(row[column.key] ?? ""))).join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}
