import { QueryProvider } from '../components/QueryProvider';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'EnterpriseX - Integrated Finance, Procurement & Supply Chain ERP',
  description: 'Enterprise Resource Planning Suite with Double-Entry Accounting, Real-Time Inventory, and Multi-Role Governance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider><AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider></QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
