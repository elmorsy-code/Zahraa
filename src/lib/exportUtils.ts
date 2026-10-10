/**
 * Utility to export tabular data to CSV with UTF-8 BOM
 * This guarantees proper Arabic rendering in Microsoft Excel and LibreOffice Calc.
 */

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void {
  // Add UTF-8 BOM so Excel opens Arabic correctly
  const BOM = '\uFEFF';

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));

  const csvContent = BOM + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
