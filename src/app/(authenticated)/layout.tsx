import { NavHeader } from "@/components/nav-header";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <NavHeader />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
