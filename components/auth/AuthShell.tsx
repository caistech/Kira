// components/auth/AuthShell.tsx
// Centered card wrapper shared by every auth page (user + admin portals).

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        {children}
      </div>
    </div>
  );
}
