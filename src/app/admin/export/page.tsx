import { ExportForm } from "@/components/ExportForm";

export default function ExportPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export</h1>
        <p className="text-sm text-zinc-500">CSV pre mzdovú alebo účtovníctvo.</p>
      </div>
      <ExportForm defaultMonth={currentMonth} />
    </div>
  );
}
