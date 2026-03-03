import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  ClipboardList, 
  FileCheck,
  HardHat,
  TrendingUp,
  FileText,
  Menu,
  X,
  ChevronRight,
  Folder,
  Sigma,
  Map,
  Pencil
} from "lucide-react";


const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Deals", icon: Building2, page: "Deals" },
  { name: "Projects", icon: Folder, page: "Projects" },
  { name: "Contacts", icon: Users, page: "Contacts" },
  { name: "Tasks", icon: ClipboardList, page: "Tasks" },
  { name: "Entitlements", icon: FileCheck, page: "Entitlements" },
  { name: "Development", icon: HardHat, page: "Development" },
  { name: "Floor Plans", icon: Building2, page: "FloorPlansLibrary" },
  { name: "Business Plan", icon: FileText, page: "BusinessPlan" },
  { name: "Analytics", icon: TrendingUp, page: "Analytics" },
  { name: "Financial Dashboard", icon: DollarSign, page: "FinancialDashboard" },
  { name: "Reports", icon: FileText, page: "Reports" },
  { name: "Process Improvement", icon: Sigma, page: "LeanSixSigma" },
  { name: "GIS Map", icon: Map, page: "GISMap" },
  { name: "Plan Check", icon: FileCheck, page: "PlanCheck" },
  { name: "CAD Drafter", icon: Pencil, page: "CADDrafter" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a2099619afaafce3010e1/5f5761863_c3a3fee7-5d59-4dc1-94cc-4c194769f87f.png" alt="Parcelr" className="w-10 h-10 object-contain" />
            <span className="text-lg font-semibold text-slate-900">Parcelr</span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a2099619afaafce3010e1/5f5761863_c3a3fee7-5d59-4dc1-94cc-4c194769f87f.png" alt="Parcelr" className="w-10 h-10 object-contain" />
              <span className="text-lg font-semibold text-slate-900">Parcelr</span>
            </Link>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}