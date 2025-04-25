import { useLocation } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X } from "lucide-react";

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const navigateTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };
  
  return (
    <header className="h-12 bg-[#0A1929] border-b border-gray-800 flex items-center justify-between px-2 sm:px-4 shadow-sm">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs sm:text-sm">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-2 py-1 rounded">
              Portfolios
              <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#111E2E] border-gray-700 z-50">
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/usd-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/usd-portfolio")}
              >
                USD Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/cad-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/cad-portfolio")}
              >
                CAD Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 ${location === '/intl-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/intl-portfolio")}
              >
                INTL Portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <button 
          onClick={() => navigateTo("/earnings")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/earnings' ? 'bg-blue-900/30' : ''}`}
        >
          Earnings
        </button>
        
        <button 
          onClick={() => navigateTo("/matrix-rules")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/matrix-rules' ? 'bg-blue-900/30' : ''}`}
        >
          Matrix Rules
        </button>
        
        <button 
          onClick={() => navigateTo("/etf-holdings")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/etf-holdings' ? 'bg-blue-900/30' : ''}`}
        >
          ETF Holdings
        </button>
        
        <button 
          onClick={() => navigateTo("/data-management")} 
          className={`text-gray-300 hover:text-white px-2 py-1 rounded ${location === '/data-management' ? 'bg-blue-900/30' : ''}`}
        >
          Data Management
        </button>
      </nav>
      
      {/* Mobile View - App Title */}
      <div className="md:hidden flex items-center">
        <span className="text-white font-mono text-sm">Investment Manager</span>
      </div>
      
      {/* Mobile Menu Toggle */}
      <button 
        className="md:hidden text-gray-300 hover:text-white p-1" 
        onClick={toggleMobileMenu}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-12 left-0 right-0 bg-[#0A1929] border-b border-gray-800 z-50 md:hidden shadow-lg">
          <div className="flex flex-col p-2">
            <div className="py-2 border-b border-gray-800">
              <span className="text-gray-300 text-xs font-mono px-3 pb-1 block">PORTFOLIOS</span>
              <button 
                onClick={() => navigateTo("/usd-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/usd-portfolio' ? 'bg-blue-900/30' : ''}`}
              >
                USD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/cad-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/cad-portfolio' ? 'bg-blue-900/30' : ''}`}
              >
                CAD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/intl-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/intl-portfolio' ? 'bg-blue-900/30' : ''}`}
              >
                INTL Portfolio
              </button>
            </div>
            
            <button 
              onClick={() => navigateTo("/earnings")} 
              className={`text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/earnings' ? 'bg-blue-900/30' : ''}`}
            >
              Earnings
            </button>
            
            <button 
              onClick={() => navigateTo("/matrix-rules")} 
              className={`text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/matrix-rules' ? 'bg-blue-900/30' : ''}`}
            >
              Matrix Rules
            </button>
            
            <button 
              onClick={() => navigateTo("/etf-holdings")} 
              className={`text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/etf-holdings' ? 'bg-blue-900/30' : ''}`}
            >
              ETF Holdings
            </button>
            
            <button 
              onClick={() => navigateTo("/data-management")} 
              className={`text-left text-gray-300 hover:text-white px-3 py-2 rounded text-sm ${location === '/data-management' ? 'bg-blue-900/30' : ''}`}
            >
              Data Management
            </button>
          </div>
        </div>
      )}
    </header>
  );
}