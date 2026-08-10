import './global.css';
import { ThemeProvider } from '../components/theme-provider';
import { QueryProvider } from '../components/query-provider';

export const metadata = {
  title: 'UDOS — University Digital Operating System',
  description: 'Enterprise multi-tenant university ERP platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
