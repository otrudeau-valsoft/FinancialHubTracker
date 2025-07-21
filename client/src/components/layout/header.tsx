import { useLocation } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Menu,
  X,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fetch real-time market index data
  const { data: marketData } = useQuery({
    queryKey: ['market-data'],
    queryFn: async () => {
      const response = await fetch('/api/market-indices/real-time');
      if (!response.ok) {
        throw new Error('Failed to fetch market indices data');
      }
      return await response.json();
    },
    // Refresh every 30 seconds for continuous real-time updates
    refetchInterval: 30 * 1000,
    // Ensure it refetches in the background
    refetchIntervalInBackground: true
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
      <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs">
        {/* Portfolios Dropdown */}
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out hover:bg-[#1A304A] font-mono tracking-wide">
              PORTFOLIOS
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#111E2E] border-[#1A304A] z-50 rounded-sm shadow-lg">
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/usd-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/usd-portfolio")}
              >
                USD PORTFOLIO
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/cad-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/cad-portfolio")}
              >
                CAD PORTFOLIO
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/intl-portfolio' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/intl-portfolio")}
              >
                INTL PORTFOLIO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Analytics Dropdown */}
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out hover:bg-[#1A304A] font-mono tracking-wide">
              ANALYTICS
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#111E2E] border-[#1A304A] z-50 rounded-sm shadow-lg">
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/earnings' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/earnings")}
              >
                EARNINGS
              </DropdownMenuItem>

              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/matrix-engine' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/matrix-engine")}
              >
                MATRIX ENGINE
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/etf-holdings' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/etf-holdings")}
              >
                ETF HOLDINGS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Stocks button - links to default stock */}
        <button 
          onClick={() => navigateTo("/stock/MSFT?region=USD")} 
          className={`text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out ${location.startsWith('/stock-details') || location.startsWith('/stock/') ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'} font-mono tracking-wide`}
        >
          STOCKS
        </button>
        
        <button 
          onClick={() => navigateTo("/economic-calendar")} 
          className={`text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out ${location === '/economic-calendar' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'} font-mono tracking-wide`}
        >
          CALENDAR
        </button>
        
        <button 
          onClick={() => navigateTo("/news")} 
          className={`text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out ${location === '/news' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'} font-mono tracking-wide`}
        >
          NEWS
        </button>
        
        <button 
          onClick={() => navigateTo("/transactions")} 
          className={`text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out ${location === '/transactions' ? 'bg-blue-900/40' : 'hover:bg-[#1A304A]'} font-mono tracking-wide`}
        >
          TRANSACTIONS
        </button>
        
        {/* System Dropdown */}
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-300 hover:text-white px-2 py-1.5 rounded-sm transition-colors duration-200 ease-in-out hover:bg-[#1A304A] font-mono tracking-wide">
              SYSTEM
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#111E2E] border-[#1A304A] z-50 rounded-sm shadow-lg">
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/data-management' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/data-management")}
              >
                DATA MANAGEMENT
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/diagnostics' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/diagnostics")}
              >
                DIAGNOSTICS
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={`text-gray-300 hover:text-white hover:bg-blue-900/30 focus:bg-blue-900/30 font-mono text-xs ${location === '/monitoring' ? 'bg-blue-900/30' : ''}`}
                onClick={() => navigateTo("/monitoring")}
              >
                MONITORING
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      
      {/* Mobile View - Market Indicators */}
      <div className="md:hidden flex items-center space-x-1">
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.sp500.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">S&P500</span>
            <span className="ml-1 flex items-center">
              {!marketData ? '--' : (
                <>
                  {marketData.sp500.positive ? 
                    <TrendingUp className="h-2 w-2 mr-0.5" /> : 
                    <TrendingDown className="h-2 w-2 mr-0.5" />
                  }
                  {marketData.sp500.return.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.tsx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">TSX</span>
            <span className="ml-1 flex items-center">
              {!marketData ? '--' : (
                <>
                  {marketData.tsx.positive ? 
                    <TrendingUp className="h-2 w-2 mr-0.5" /> : 
                    <TrendingDown className="h-2 w-2 mr-0.5" />
                  }
                  {marketData.tsx.return.toFixed(1)}%
                </>
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`flex items-center text-[8px] font-mono py-0.5 px-1 rounded-full ${!marketData ? 'bg-blue-900/30 text-blue-400' : (marketData.acwx.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}`}>
            <span className="font-semibold">ACWX</span>
            <span className="ml-1 flex items-center">
              {!marketData ? '--' : (
                <>
                  {marketData.acwx.positive ? 
                    <TrendingUp className="h-2 w-2 mr-0.5" /> : 
                    <TrendingDown className="h-2 w-2 mr-0.5" />
                  }
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
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/usd-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                USD PORTFOLIO
              </button>
              <button 
                onClick={() => navigateTo("/cad-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/cad-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                CAD PORTFOLIO
              </button>
              <button 
                onClick={() => navigateTo("/intl-portfolio")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/intl-portfolio' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                INTL PORTFOLIO
              </button>
            </div>
            
            <div className="border-b border-[#0F1A2A] py-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#38AAFD] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">ANALYTICS</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/earnings")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/earnings' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                EARNINGS
              </button>
              

              
              <button 
                onClick={() => navigateTo("/matrix-engine")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/matrix-engine' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                MATRIX ENGINE
              </button>
              
              <button 
                onClick={() => navigateTo("/etf-holdings")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/etf-holdings' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                ETF HOLDINGS
              </button>
            </div>

            <div className="border-b border-[#0F1A2A] py-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#FFD700] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">STOCKS & DATA</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/stock/MSFT?region=USD")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location.startsWith('/stock-details') || location.startsWith('/stock/') ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                STOCKS
              </button>
              
              <button 
                onClick={() => navigateTo("/economic-calendar")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/economic-calendar' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                ECONOMIC CALENDAR
              </button>
              
              <button 
                onClick={() => navigateTo("/news")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/news' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                NEWS
              </button>
              
              <button 
                onClick={() => navigateTo("/transactions")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/transactions' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                TRANSACTIONS
              </button>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center mb-2">
                <div className="h-3 w-3 bg-[#4CAF50] rounded-sm mr-2"></div>
                <span className="text-[#EFEFEF] text-xs font-mono font-semibold px-1 pb-1 block tracking-wide">SYSTEM</span>
              </div>
              
              <button 
                onClick={() => navigateTo("/data-management")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/data-management' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                DATA MANAGEMENT
              </button>
              
              <button 
                onClick={() => navigateTo("/diagnostics")} 
                className={`w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-sm text-xs font-mono transition-colors duration-200 ease-in-out ${location === '/diagnostics' ? 'bg-[#1A304A]' : 'hover:bg-[#162639]'}`}
              >
                DIAGNOSTICS
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}