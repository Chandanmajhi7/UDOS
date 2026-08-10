import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ThemeToggle } from '../components/theme-toggle';
import { TenantSelectForm } from '../features/tenant/tenant-select-form';

export default function TenantSelectPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">UDOS</h1>
        <p className="text-sm text-muted-foreground">University Digital Operating System</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Go to your institution</CardTitle>
          <CardDescription>
            Enter your institution&apos;s identifier to continue to its portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantSelectForm />
        </CardContent>
      </Card>
    </main>
  );
}
