import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutGrid, TrendingUp, LineChart, BookOpen, Bell, History, Cog } from "lucide-react";

export const Sidebar = () => {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-primary-200">
        <div className="flex items-center justify-center h-16 px-4 bg-primary-300">
          <span className="text-xl font-semibold text-gray-200">Portfolio Tracker</span>
        </div>
        
        <div className="h-0 flex-1 flex flex-col overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link href="/">
              <a className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                isActive("/") 
                  ? "bg-primary-50 text-white" 
                  : "text-gray-300 hover:bg-primary-50 hover:text-white"
              )}>
                <LayoutGrid className="mr-3 h-5 w-5" />
                Dashboards
              </a>
            </Link>
            
            <div className="space-y-1">
              <Link href="/usd-portfolio">
                <a className={cn(
                  "flex items-center w-full px-2 py-2 text-sm font-medium rounded-md group",
                  isActive("/usd-portfolio") 
                    ? "bg-primary-50 text-white" 
                    : "text-gray-300 hover:bg-primary-50 hover:text-white"
                )}>
                  <TrendingUp className="mr-3 h-5 w-5" />
                  USD Portfolio
                </a>
              </Link>
              
              <Link href="/cad-portfolio">
                <a className={cn(
                  "flex items-center w-full px-2 py-2 text-sm font-medium rounded-md group",
                  isActive("/cad-portfolio") 
                    ? "bg-primary-50 text-white" 
                    : "text-gray-300 hover:bg-primary-50 hover:text-white"
                )}>
                  <TrendingUp className="mr-3 h-5 w-5" />
                  CAD Portfolio
                </a>
              </Link>
              
              <Link href="/intl-portfolio">
                <a className={cn(
                  "flex items-center w-full px-2 py-2 text-sm font-medium rounded-md group",
                  isActive("/intl-portfolio") 
                    ? "bg-primary-50 text-white" 
                    : "text-gray-300 hover:bg-primary-50 hover:text-white"
                )}>
                  <TrendingUp className="mr-3 h-5 w-5" />
                  INTL Portfolio
                </a>
              </Link>
            </div>
            
            <Link href="/matrix-rules">
              <a className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                isActive("/matrix-rules") 
                  ? "bg-primary-50 text-white" 
                  : "text-gray-300 hover:bg-primary-50 hover:text-white"
              )}>
                <BookOpen className="mr-3 h-5 w-5" />
                Matrix Rules
              </a>
            </Link>
            
            <Link href="/alerts">
              <a className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                isActive("/alerts") 
                  ? "bg-primary-50 text-white" 
                  : "text-gray-300 hover:bg-primary-50 hover:text-white"
              )}>
                <Bell className="mr-3 h-5 w-5" />
                Alerts
              </a>
            </Link>
            
            <Link href="/historical-data">
              <a className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                isActive("/historical-data") 
                  ? "bg-primary-50 text-white" 
                  : "text-gray-300 hover:bg-primary-50 hover:text-white"
              )}>
                <History className="mr-3 h-5 w-5" />
                Historical Data
              </a>
            </Link>
            
            <Link href="/etf-holdings">
              <a className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                isActive("/etf-holdings") 
                  ? "bg-primary-50 text-white" 
                  : "text-gray-300 hover:bg-primary-50 hover:text-white"
              )}>
                <LineChart className="mr-3 h-5 w-5" />
                ETF Holdings
              </a>
            </Link>
          </nav>
        </div>
        
        <div className="flex-shrink-0 flex p-4 bg-primary-300">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div>
                <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Portfolio Manager</p>
                <Link href="/settings">
                  <a className="text-xs font-medium text-gray-400">Settings</a>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
