interface Props {
  exportUrl: string;
  filename?: string;
}

export default function ExportButton({ exportUrl, filename = 'export' }: Props) {
  const handleExport = async () => {
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <button className="btn btn-export" onClick={handleExport}>
      Export CSV
    </button>
  );
}
