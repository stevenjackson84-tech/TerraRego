import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/shared/NotificationCenter";
import { getSession, logout, getDomain, getOrgName } from "@/lib/localAuth";
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  FileCheck,
  HardHat,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  Folder,
  Map,
  Pencil,
  Calendar,
  Briefcase,
  Ruler,
  BookOpen,
  ScanSearch,
  LogOut,
  Shield
} from "lucide-react";


const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Acquisitions", icon: Building2, page: "Deals" },
  { name: "Projects", icon: Folder, page: "Projects" },
  { name: "Contacts", icon: Users, page: "Contacts" },
  { name: "Calendar", icon: Calendar, page: "Calendar" },
  { name: "Tasks", icon: ClipboardList, page: "Tasks" },
  { name: "Entitlements", icon: FileCheck, page: "Entitlements" },
  { name: "Development", icon: HardHat, page: "Development" },
  { name: "Floor Plans", icon: Building2, page: "FloorPlansLibrary" },
  { name: "Strategy Hub", icon: TrendingUp, page: "StrategyHub" },
  { name: "GIS Map", icon: Map, page: "GISMap" },
  { name: "Favorites", icon: Building2, page: "Favorites" },
  { name: "Plan Check", icon: FileCheck, page: "PlanCheck" },
  { name: "CAD Drafter", icon: Pencil, page: "CADDrafter" },
  { name: "Bid Marketplace", icon: Briefcase, page: "Marketplace" },
  { name: "Site Analysis", icon: ScanSearch, page: "SiteAnalysis" },
  { name: "Project Takeoff", icon: Ruler, page: "Takeoff" },
  { name: "Unit Cost Library", icon: BookOpen, page: "UnitCostLibrary" },
  { name: "User Management", icon: Users, page: "UserManagement" },
  { name: "Organization", icon: Shield, page: "Organization" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = getSession();
  const userEmail = currentUser?.email || null;
  const userInitials = currentUser?.name
    ? currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const orgName = currentUser ? getOrgName(getDomain(currentUser.email)) : null;

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

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
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <img src="/parcelr-logo.png" alt="Parcelr" className="w-8 h-8 object-contain" />
            <span className="text-sm font-semibold text-slate-900">Parcelr</span>
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

        <nav className="p-2 space-y-0.5 overflow-y-auto flex-1">
          {navigation.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-150",
                  isActive 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
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
              <img src="/parcelr-logo.png" alt="Parcelr" className="w-10 h-10 object-contain" />
              <span className="text-lg font-semibold text-slate-900">Parcelr</span>
            </Link>
            {userEmail && <NotificationCenter userEmail={userEmail} />}
          </div>
        </header>

        {/* Desktop header with user info + logout */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {userEmail && <NotificationCenter userEmail={userEmail} />}
            {currentUser && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</p>
                  {orgName && <p className="text-xs text-slate-400 leading-tight">{orgName}</p>}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                  {userInitials}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-slate-400 hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
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