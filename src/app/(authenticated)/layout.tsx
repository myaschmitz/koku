import { NavHeader } from "@/components/nav-header";
import { FontSettings } from "@/components/font-settings";
import { AccentSettings } from "@/components/accent-settings";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <FontSettings />
      <AccentSettings />
      <NavHeader />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
