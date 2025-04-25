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
      {/* Desktop AlphaGen Logo - Only visible on larger screens */}
      <div className="hidden md:flex items-center mr-6">
        <div className="flex items-center">
          <span className="text-[#E91E63] font-mono text-base font-bold tracking-tight">ALPHA</span>
          <span className="text-[#38AAFD] font-mono text-base font-bold tracking-tight">GEN</span>
          <span className="text-[#4CAF50] text-xs ml-1 opacity-80">&#x2713;</span>
          <div className="h-3 mx-4 w-px bg-gray-700"></div>
        </div>
      </div>
      
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
        <div className="flex items-center">
          <span className="text-[#E91E63] font-mono text-sm font-bold tracking-tight">ALPHA</span>
          <span className="text-[#38AAFD] font-mono text-sm font-bold tracking-tight">GEN</span>
          <span className="text-[#4CAF50] text-xs ml-1 opacity-80">&#x2713;</span>
        </div>
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
            <div className="py-2 border-b border-[#0F1A2A]">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#E91E63] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">PORTFOLIOS</span>
              </div>
              <button 
                onClick={() => navigateTo("/usd-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/usd-portfolio' ? 'bg-[#1A304A]' : ''}`}
              >
                USD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/cad-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/cad-portfolio' ? 'bg-[#1A304A]' : ''}`}
              >
                CAD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/intl-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/intl-portfolio' ? 'bg-[#1A304A]' : ''}`}
              >
                INTL Portfolio
              </button>
            </div>
            
            <div className="border-b border-[#0F1A2A] py-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#38AAFD] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">ANALYTICS</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/earnings")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/earnings' ? 'bg-[#1A304A]' : ''}`}
              >
                Earnings Center
              </button>
              
              <button 
                onClick={() => navigateTo("/matrix-rules")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/matrix-rules' ? 'bg-[#1A304A]' : ''}`}
              >
                Matrix Rules
              </button>
              
              <button 
                onClick={() => navigateTo("/etf-holdings")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/etf-holdings' ? 'bg-[#1A304A]' : ''}`}
              >
                ETF Holdings
              </button>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#4CAF50] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">SYSTEM</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/data-management")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-mono ${location === '/data-management' ? 'bg-[#1A304A]' : ''}`}
              >
                Data Management
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}