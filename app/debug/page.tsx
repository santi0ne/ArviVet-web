import { AuthDiagnostics } from '@/components/debug/auth-diagnostics';

export default function DebugPage() {
  return (
    <main style={{ padding: '20px' }}>
      <AuthDiagnostics />
    </main>
  );
}
