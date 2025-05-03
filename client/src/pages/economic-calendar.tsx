import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, FileDown, Filter } from 'lucide-react';

// Import components
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Icons for different event significance and impact
const ImpactIndicator = ({ impact }: { impact: string }) => {
  const getColor = () => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`w-3 h-3 rounded-full ${getColor()}`} title={impact}></div>
  );
};

// Format country names and add flag emojis
const CountryDisplay = ({ country }: { country: string }) => {
  const countryFlags: Record<string, string> = {
    'US': '🇺🇸',
    'CA': '🇨🇦',
    'EU': '🇪🇺',
    'UK': '🇬🇧',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
    'CH': '🇨🇭',
  };

  const flag = countryFlags[country] || '';
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{flag}</span>
      <span>{country}</span>
    </div>
  );
};

const formatTime = (time: string) => {
  if (!time) return '--:--';
  return time;
};

// Generate the timeline visual indicator similar to Trading Economics
const TimelineIndicator = ({ actual, forecast, previous }: { 
  actual: number | null; 
  forecast: number | null;
  previous: number | null;
}) => {
  if (!actual || !forecast || !previous) return null;
  
  // Determine the direction (positive/negative)
  const isPositive = actual >= previous;
  
  // Calculate relative position between 0-100
  const min = Math.min(actual, forecast, previous) * 0.9;
  const max = Math.max(actual, forecast, previous) * 1.1;
  const range = max - min;
  
  const getPosition = (value: number) => {
    return Math.max(0, Math.min(100, ((value - min) / range) * 100));
  };
  
  const actualPos = getPosition(actual);
  const forecastPos = getPosition(forecast);
  const previousPos = getPosition(previous);

  return (
    <div className="relative h-5 w-20">
      {/* Base line */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600"></div>
      
      {/* Previous marker */}
      <div 
        className="absolute top-1/2 w-0.5 h-3 bg-gray-400 -translate-y-1/2"
        style={{ left: `${previousPos}%` }}
      ></div>
      
      {/* Forecast marker */}
      <div 
        className="absolute top-1/2 w-0.5 h-3 bg-blue-400 -translate-y-1/2"
        style={{ left: `${forecastPos}%` }}
      ></div>
      
      {/* Actual marker (with color based on direction) */}
      <div 
        className={`absolute top-1/2 w-1 h-4 -translate-y-1/2 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
        style={{ left: `${actualPos}%` }}
      ></div>
    </div>
  );
};

export default function EconomicCalendarPage() {
  // Make sure React hooks are at the top of the component
  const [dateRange, setDateRange] = useState<'current' | 'custom'>('current');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'1W' | '1M' | 'YTD' | '1Y'>('1M');
  
  // Filter states
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'EU', 'JP', 'UK', 'CA', 'CN']);
  const [selectedImpact, setSelectedImpact] = useState<string[]>(['High', 'Medium', 'Low']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Interest Rate', 'GDP', 'CPI', 'PMI', 'Employment', 'Trade Balance', 'Retail'
  ]);
  
  // All available filter options
  const countries = [
    { value: 'US', label: '🇺🇸 United States' },
    { value: 'EU', label: '🇪🇺 Eurozone' },
    { value: 'UK', label: '🇬🇧 United Kingdom' },
    { value: 'JP', label: '🇯🇵 Japan' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'CN', label: '🇨🇳 China' },
    { value: 'AU', label: '🇦🇺 Australia' },
    { value: 'NZ', label: '🇳🇿 New Zealand' },
    { value: 'CH', label: '🇨🇭 Switzerland' },
  ];
  
  const impacts = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];
  
  const categories = [
    { value: 'Interest Rate', label: 'Interest Rate' },
    { value: 'GDP', label: 'GDP' },
    { value: 'CPI', label: 'CPI' },
    { value: 'PMI', label: 'PMI' },
    { value: 'Employment', label: 'Employment' },
    { value: 'Trade Balance', label: 'Trade Balance' },
    { value: 'Retail', label: 'Retail Sales' },
    { value: 'Housing', label: 'Housing' },
    { value: 'Consumer', label: 'Consumer' },
    { value: 'Industrial', label: 'Industrial' },
  ];
  
  // Toggle country filter
  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };
  
  // Toggle impact filter
  const toggleImpact = (impact: string) => {
    if (selectedImpact.includes(impact)) {
      setSelectedImpact(selectedImpact.filter(i => i !== impact));
    } else {
      setSelectedImpact([...selectedImpact, impact]);
    }
  };
  
  // Toggle category filter
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  // Generate options for month/year selects
  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Fetch economic calendar data with cache (due to 15 req/month limit)
  const { data: calendarData, isLoading, error, refetch } = useQuery({
    queryKey: ['economic-calendar', dateRange, year, month, day],
    queryFn: async () => {
      let url = '/api/economic-calendar';
      
      if (dateRange === 'current') {
        url += '/current';
      } else {
        url += `?year=${year}&month=${month}${day ? `&day=${day}` : ''}`;
      }
      
      // Check if we have cached data first
      const cachedData = sessionStorage.getItem(url);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch economic calendar data');
      }
      
      const data = await response.json();
      
      // Cache the data
      sessionStorage.setItem(url, JSON.stringify(data));
      
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours due to rate limit
  });

  // Apply filters to the events
  const getFilteredEvents = () => {
    if (!calendarData?.data) return {};
    
    const filteredData: Record<string, any[]> = {};
    
    // For each date
    Object.entries(calendarData.data).forEach(([date, events]) => {
      // Filter events
      const filteredEvents = (events as any[]).filter(event => {
        // Check country filter
        if (!selectedCountries.includes(event.country)) return false;
        
        // Check impact filter (case insensitive)
        if (!selectedImpact.some(impact => 
          impact.toLowerCase() === (event.impact || 'medium').toLowerCase()
        )) return false;
        
        // Check category filter (if event contains any selected category keyword)
        if (!selectedCategories.some(category => 
          event.event.toLowerCase().includes(category.toLowerCase())
        )) return false;
        
        return true;
      });
      
      // Only add date if it has events after filtering
      if (filteredEvents.length > 0) {
        filteredData[date] = filteredEvents;
      }
    });
    
    return filteredData;
  };

  const filteredEvents = getFilteredEvents();
  const dates = Object.keys(filteredEvents).sort();

  const forceRefresh = () => {
    // Clear cache for the current URL
    let url = '/api/economic-calendar';
    if (dateRange === 'current') {
      url += '/current';
    } else {
      url += `?year=${year}&month=${month}${day ? `&day=${day}` : ''}`;
    }
    sessionStorage.removeItem(url);
    refetch();
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">Economic Calendar</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#38AAFD]"></div>
            </div>
            <p className="text-sm text-[#7A8999] mt-2">Track important economic events and indicators</p>
          </div>
        </div>
      </div>

      {/* Filter bar similar to portfolio page */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="h-8 rounded-sm bg-[#0B1728] text-[#7A8999] text-xs font-mono border-[#1A304A] hover:bg-[#162639] hover:text-[#EFEFEF]"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-[#0B1728] border-[#1A304A] p-3 rounded-sm shadow-xl">
            <div className="space-y-3">
              <div>
                <h4 className="font-mono text-xs text-[#7A8999] mb-2">COUNTRIES</h4>
                <div className="grid grid-cols-2 gap-2">
                  {countries.map(country => (
                    <div key={country.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`country-${country.value}`} 
                        checked={selectedCountries.includes(country.value)}
                        onCheckedChange={() => toggleCountry(country.value)}
                        className="h-3.5 w-3.5 rounded-sm data-[state=checked]:bg-[#38AAFD] data-[state=checked]:border-[#38AAFD]"
                      />
                      <Label 
                        htmlFor={`country-${country.value}`}
                        className="text-xs font-mono text-[#EFEFEF] cursor-pointer"
                      >
                        {country.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-mono text-xs text-[#7A8999] mb-2">IMPACT</h4>
                <div className="flex flex-col gap-2">
                  {impacts.map(impact => (
                    <div key={impact.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`impact-${impact.value}`} 
                        checked={selectedImpact.includes(impact.value)}
                        onCheckedChange={() => toggleImpact(impact.value)}
                        className="h-3.5 w-3.5 rounded-sm data-[state=checked]:bg-[#38AAFD] data-[state=checked]:border-[#38AAFD]"
                      />
                      <Label 
                        htmlFor={`impact-${impact.value}`}
                        className="text-xs font-mono text-[#EFEFEF] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ImpactIndicator impact={impact.value} />
                          {impact.label}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-mono text-xs text-[#7A8999] mb-2">CATEGORIES</h4>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(category => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${category.value}`} 
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                        className="h-3.5 w-3.5 rounded-sm data-[state=checked]:bg-[#38AAFD] data-[state=checked]:border-[#38AAFD]"
                      />
                      <Label 
                        htmlFor={`category-${category.value}`}
                        className="text-xs font-mono text-[#EFEFEF] cursor-pointer"
                      >
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Time period buttons - exactly like portfolio */}
        <div className="flex h-8 rounded-sm overflow-hidden">
          <button 
            className={`px-3 h-full text-xs font-mono font-medium border-y border-l border-[#1A304A] ${activeTab === '1W' ? 'bg-[#38AAFD] text-white' : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'}`}
            onClick={() => setActiveTab('1W')}
          >
            1W
          </button>
          <button 
            className={`px-3 h-full text-xs font-mono font-medium border-y border-l border-[#1A304A] ${activeTab === '1M' ? 'bg-[#38AAFD] text-white' : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'}`}
            onClick={() => setActiveTab('1M')}
          >
            1M
          </button>
          <button 
            className={`px-3 h-full text-xs font-mono font-medium border-y border-l border-[#1A304A] ${activeTab === 'YTD' ? 'bg-[#38AAFD] text-white' : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'}`}
            onClick={() => setActiveTab('YTD')}
          >
            YTD
          </button>
          <button 
            className={`px-3 h-full text-xs font-mono font-medium border border-[#1A304A] ${activeTab === '1Y' ? 'bg-[#38AAFD] text-white' : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'}`}
            onClick={() => setActiveTab('1Y')}
          >
            1Y
          </button>
        </div>
        
        <Select 
          value={dateRange === 'current' ? 'current' : 'custom'}
          onValueChange={(val) => setDateRange(val as 'current' | 'custom')}
        >
          <SelectTrigger className="h-8 w-[150px] rounded-sm bg-[#0B1728] text-[#EFEFEF] text-xs border-[#1A304A] font-mono">
            <SelectValue placeholder="Current Month" />
          </SelectTrigger>
          <SelectContent className="bg-[#0B1728] border-[#1A304A] rounded-sm text-[#EFEFEF] font-mono text-xs">
            <SelectItem value="current" className="rounded-sm">Current Month</SelectItem>
            <SelectItem value="custom" className="rounded-sm">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-grow"></div>
        
        <Button 
          className="h-8 rounded-sm bg-[#38AAFD] hover:bg-[#2196F3] text-white text-xs font-mono"
          onClick={forceRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh Data
        </Button>
        
        <Button 
          variant="outline" 
          className="h-8 rounded-sm bg-[#0B1728] text-[#7A8999] text-xs font-mono border-[#1A304A] hover:bg-[#162639] hover:text-[#EFEFEF]"
        >
          <FileDown className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </div>
      
      {/* API Usage Note - with the exact same styling as portfolio alert cards */}
      <div className="mb-6 bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
        <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
          <h3 className="text-amber-400 font-mono text-xs font-medium tracking-wide">API USAGE NOTE</h3>
          <div className="h-1 w-28 bg-amber-500"></div>
        </div>
        <div className="p-4">
          <p className="text-amber-500 text-xs font-mono">
            Due to API rate limits (15 requests/month), calendar data is cached to minimize API usage. Use the Refresh Data button to force a new data fetch if needed.
          </p>
        </div>
      </div>
      
      {/* Error message with the exact same styling as portfolio cards */}
      {error && (
        <div className="mb-6 bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
          <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
            <h3 className="text-red-400 font-mono text-xs font-medium tracking-wide">ERROR</h3>
            <div className="h-1 w-28 bg-red-500"></div>
          </div>
          <div className="p-4">
            <p className="text-red-400 text-xs font-mono">
              Error loading calendar data. Please try again later.
            </p>
          </div>
        </div>
      )}
      
      {/* Events Table with the exact same styling as portfolio tables */}
      {isLoading ? (
        <div className="mb-6 bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
          <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
            <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">Loading...</h3>
            <div className="h-1 w-28 bg-[#38AAFD]"></div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20 bg-[#1A304A]" />
                  <Skeleton className="h-4 w-40 bg-[#1A304A]" />
                  <Skeleton className="h-4 w-20 bg-[#1A304A]" />
                  <Skeleton className="h-4 w-20 bg-[#1A304A]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : dates.length === 0 ? (
        <div className="mb-6 bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
          <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
            <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">No Events Found</h3>
            <div className="h-1 w-28 bg-[#38AAFD]"></div>
          </div>
          <div className="p-4 text-center">
            <p className="text-[#7A8999] text-xs font-mono">
              No economic events found for the selected filters.
            </p>
          </div>
        </div>
      ) : (
        dates.map(date => (
          <div key={date} className="mb-6 bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">{date}</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1A304A]">
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Time</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Country</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Event</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Impact</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Actual</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Forecast</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Previous</th>
                    <th className="px-4 py-2 text-[#7A8999] font-mono text-xs uppercase font-normal">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents[date].map((event, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-[#1A304A] hover:bg-[#0F1F35]"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-[#EFEFEF]">
                        {formatTime(event.time)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#EFEFEF]">
                        <CountryDisplay country={event.country} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <ImpactIndicator impact={event.impact || 'Medium'} />
                          <span className={`font-mono text-xs ${
                            event.impact?.toLowerCase() === 'high' 
                              ? 'text-red-300' 
                              : 'text-[#EFEFEF]'
                          }`}>{event.event}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`
                          rounded px-2 py-0.5 text-center font-mono text-xs
                          ${event.impact?.toLowerCase() === 'high' ? 'bg-red-950/30 text-red-400 border border-red-800' : ''}
                          ${event.impact?.toLowerCase() === 'medium' ? 'bg-amber-950/30 text-amber-400 border border-amber-800' : ''}
                          ${event.impact?.toLowerCase() === 'low' ? 'bg-green-950/30 text-green-400 border border-green-800' : ''}
                          ${!event.impact ? 'bg-gray-800/30 text-gray-400 border border-gray-700' : ''}
                        `}>
                          {event.impact || 'Medium'}
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${
                        event.actual > event.previous ? 'text-green-400' : 
                        event.actual < event.previous ? 'text-red-400' : 'text-[#EFEFEF]'
                      }`}>
                        {event.actual ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#38AAFD]">
                        {event.forecast ?? '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#7A8999]">
                        {event.previous ?? '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        {event.actual && event.forecast && event.previous && (
                          <TimelineIndicator 
                            actual={parseFloat(event.actual)} 
                            forecast={parseFloat(event.forecast)} 
                            previous={parseFloat(event.previous)} 
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}