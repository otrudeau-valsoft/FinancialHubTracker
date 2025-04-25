import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function Header() {
  const [location, navigate] = useLocation();
  
  return (
    <header className="h-12 bg-[#0A1929] border-b border-gray-800 flex items-center px-4 shadow-sm">
      <nav className="flex items-center space-x-6 text-sm">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-2 py-1 rounded">
              Portfolios
              <ChevronDown className="ml-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#111E2E] border-gray-700 z-50">
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/usd-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigate("/usd-portfolio")}
              >
                USD Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/cad-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigate("/cad-portfolio")}
              >
                CAD Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/intl-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigate("/intl-portfolio")}
              >
                INTL Portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <button 
          onClick={() => navigate("/matrix-rules")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/matrix-rules' ? 'bg-blue-900/30' : ''}`}
        >
          Matrix Rules
        </button>
        
        <button 
          onClick={() => navigate("/etf-holdings")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/etf-holdings' ? 'bg-blue-900/30' : ''}`}
        >
          ETF Holdings
        </button>
        
        <button 
          onClick={() => navigate("/data-management")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/data-management' ? 'bg-blue-900/30' : ''}`}
        >
          Data Management
        </button>
        
        <button 
          onClick={() => navigate("/earnings")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/earnings' ? 'bg-blue-900/30' : ''}`}
        >
          Earnings
        </button>
      </nav>
    </header>
  );
}