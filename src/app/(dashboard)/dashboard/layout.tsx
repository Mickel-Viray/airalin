import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 lg:px-8 h-16 flex items-center border-b bg-white shrink-0">
        <Link className="flex items-center gap-2" href="/dashboard">
          <BrainCircuit className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl tracking-tight">Airalin</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:inline-block">
            {user.email}
          </span>
          <form action={async () => {
            "use server";
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect("/login");
          }}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}