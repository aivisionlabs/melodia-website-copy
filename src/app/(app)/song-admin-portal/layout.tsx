import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

  if (!isAuthenticated) {
    redirect("/admin-login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* Main content — offset by topbar height on mobile, full height on desktop */}
      {/* pt-14 offsets the fixed mobile topbar; lg:pt-0 removes it on desktop */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
