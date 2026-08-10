import { Card, CardContent } from '../../components/ui/card';

export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        {/* Proportional figures, not tabular-nums — this is a standalone value, not a table column (marks-and-anatomy.md). */}
        <p className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
