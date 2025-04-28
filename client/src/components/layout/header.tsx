import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Mock data for market returns - in a real app, this would come from an API
  const { data: marketData } = useQuery({
    queryKey: ['market-data'],
    queryFn: async () => {
      // In a production app, this would fetch from your API
      // For now, using mock data to demonstrate the UI
      return {
        sp500: { return: 0.32, positive: true },
        tsx: { return: -0.18, positive: false },
        acwx: { return: 0.21, positive: true }
      };
    },
    // Refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000
  });
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const navigateTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };
  
  return (
    <header className="h-12 bg-gradient-to-r from-[#061220] to-[#0D1F32] border-b border-[#1A304A] flex items-center justify-between px-2 sm:px-4 shadow-md">
      {/* Market Indicators */}
      <div className="hidden md:flex items-center mr-4 space-x-3">
        <div className="flex items-center">
          <div className={`flex items-center text-[10px] font-mono space-x-1 py-0.5 px-1.5 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.sp500.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">S&P500</span>
            <span className="flex items-center">
              {!marketData ? null : (
                marketData.sp500.positive ? 
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : 
                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
              )}
              {!marketData ? '--' : `${marketData.sp500.return.toFixed(2)}%`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[10px] font-mono space-x-1 py-0.5 px-1.5 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.tsx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">TSX</span>
            <span className="flex items-center">
              {!marketData ? null : (
                marketData.tsx.positive ? 
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : 
                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
              )}
              {!marketData ? '--' : `${Math.abs(marketData.tsx.return).toFixed(2)}%`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[10px] font-mono space-x-1 py-0.5 px-1.5 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.acwx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">ACWX</span>
            <span className="flex items-center">
              {!marketData ? null : (
                marketData.acwx.positive ? 
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : 
                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
              )}
              {!marketData ? '--' : `${marketData.acwx.return.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs sm:text-sm">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out hover:bg-[#1A304A]">
              Portfolios
              <ChevronDown className="ml-1.5 h-3 w-3 sm:h-4 sm:w-4 opacity-70" />
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
          className={`text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out ${location === '/earnings' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'}`}
        >
          Earnings
        </button>
        
        <button 
          onClick={() => navigateTo("/matrix-rules")} 
          className={`text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out ${location === '/matrix-rules' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'}`}
        >
          Matrix Rules
        </button>
        
        <button 
          onClick={() => navigateTo("/etf-holdings")} 
          className={`text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out ${location === '/etf-holdings' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'}`}
        >
          ETF Holdings
        </button>
        
        <button 
          onClick={() => navigateTo("/news")} 
          className={`text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out ${location === '/news' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'}`}
        >
          News
        </button>
        
        <button 
          onClick={() => navigateTo("/data-management")} 
          className={`text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-colors duration-200 ease-in-out ${location === '/data-management' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'}`}
        >
          Data Management
        </button>
      </nav>
      
      {/* Mobile View - Market Indicators */}
      <div className="md:hidden flex items-center space-x-1">
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.sp500.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">S&P</span>
            <span>
              {!marketData ? '--' : (
                <>
                  {marketData.sp500.positive ? '+' : ''}
                  {marketData.sp500.return.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.tsx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">TSX</span>
            <span>
              {!marketData ? '--' : (
                <>
                  {marketData.tsx.positive ? '+' : ''}
                  {marketData.tsx.return.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.acwx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">ACX</span>
            <span>
              {!marketData ? '--' : (
                <>
                  {marketData.acwx.positive ? '+' : ''}
                  {marketData.acwx.return.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Toggle */}
      <button 
        className="md:hidden text-gray-300 hover:text-white p-1.5 rounded-md transition-colors duration-200 hover:bg-[#1A304A]" 
        onClick={toggleMobileMenu}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-12 left-0 right-0 bg-gradient-to-b from-[#0D1F32] to-[#081424] border-b border-[#1A304A] z-50 md:hidden shadow-lg">
          <div className="flex flex-col p-2">
            <div className="py-2 border-b border-[#0F1A2A]">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#E91E63] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">PORTFOLIOS</span>
              </div>
              <button 
                onClick={() => navigateTo("/usd-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/usd-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                USD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/cad-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/cad-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                CAD Portfolio
              </button>
              <button 
                onClick={() => navigateTo("/intl-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/intl-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
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
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/earnings' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                Earnings Center
              </button>
              
              <button 
                onClick={() => navigateTo("/matrix-rules")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/matrix-rules' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                Matrix Rules
              </button>
              
              <button 
                onClick={() => navigateTo("/etf-holdings")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/etf-holdings' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                ETF Holdings
              </button>
              
              <button 
                onClick={() => navigateTo("/news")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/news' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                Market News
              </button>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#4CAF50] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">SYSTEM</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/data-management")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/data-management' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
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