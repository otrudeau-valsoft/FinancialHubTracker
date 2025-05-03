import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, FileDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/page-container';

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

  // Navigate to previous/next month
  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = month;
    let newYear = year;
    
    if (direction === 'prev') {
      if (month === 1) {
        newMonth = 12;
        newYear = year - 1;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 12) {
        newMonth = 1;
        newYear = year + 1;
      } else {
        newMonth = month + 1;
      }
    }
    
    setMonth(newMonth);
    setYear(newYear);
  };

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
    <PageContainer>
      <div className="text-white">
        <h1 className="text-2xl font-bold mt-6 mb-1 ml-6">Economic Calendar</h1>
        <p className="text-gray-400 ml-6 mb-6">Track important economic events and indicators</p>
        
        <div className="flex flex-wrap items-center gap-2 mx-6 mb-6">
          <Button variant="outline" size="sm" className="bg-transparent border-[#333] text-gray-300 hover:bg-[#121a24]">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <div className="flex h-9 rounded-md overflow-hidden">
            <button 
              className={`px-3 h-full text-sm font-medium ${activeTab === '1W' ? 'bg-[#0A7AFF] text-white' : 'bg-[#121a24] text-gray-300 hover:bg-[#1a2536]'}`}
              onClick={() => setActiveTab('1W')}
            >
              1W
            </button>
            <button 
              className={`px-3 h-full text-sm font-medium ${activeTab === '1M' ? 'bg-[#0A7AFF] text-white' : 'bg-[#121a24] text-gray-300 hover:bg-[#1a2536]'}`}
              onClick={() => setActiveTab('1M')}
            >
              1M
            </button>
            <button 
              className={`px-3 h-full text-sm font-medium ${activeTab === 'YTD' ? 'bg-[#0A7AFF] text-white' : 'bg-[#121a24] text-gray-300 hover:bg-[#1a2536]'}`}
              onClick={() => setActiveTab('YTD')}
            >
              YTD
            </button>
            <button 
              className={`px-3 h-full text-sm font-medium ${activeTab === '1Y' ? 'bg-[#0A7AFF] text-white' : 'bg-[#121a24] text-gray-300 hover:bg-[#1a2536]'}`}
              onClick={() => setActiveTab('1Y')}
            >
              1Y
            </button>
          </div>
          
          <Select 
            value={dateRange === 'current' ? 'current' : 'custom'}
            onValueChange={(val) => setDateRange(val as 'current' | 'custom')}
          >
            <SelectTrigger className="h-9 bg-[#121a24] border-[#333] text-gray-300 w-[150px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent className="bg-[#121a24] border-[#333] text-gray-200">
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex-grow"></div>
          
          <Button 
            size="sm" 
            onClick={forceRefresh}
            className="bg-[#0A7AFF] hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-transparent border-[#333] text-gray-300 hover:bg-[#121a24]"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        
        {/* API Usage Note */}
        <div className="mx-6 mb-6">
          <Card className="bg-[#121a24] border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
              <CardTitle className="text-amber-400 font-medium text-sm tracking-wide">API USAGE NOTE</CardTitle>
              <div className="h-1 w-28 bg-amber-500"></div>
            </CardHeader>
            <CardContent className="px-6 py-2">
              <p className="text-sm text-amber-500">
                Due to API rate limits (15 requests/month), calendar data is cached to minimize API usage. Use the Refresh Data button to force a new data fetch if needed.
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mx-6 mb-6">
            <Card className="bg-[#121a24] border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
                <CardTitle className="text-red-400 font-medium text-sm tracking-wide">ERROR</CardTitle>
                <div className="h-1 w-28 bg-red-500"></div>
              </CardHeader>
              <CardContent className="px-6 py-2">
                <p className="text-sm text-red-400">Error loading calendar data. Please try again later.</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Events Table */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="mx-6 mb-6">
              <Card className="bg-[#121a24] border-0">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
                  <CardTitle className="text-white font-medium text-lg">Loading...</CardTitle>
                  <div className="h-1 w-28 bg-blue-500"></div>
                </CardHeader>
                <CardContent className="px-6 py-4">
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20 bg-gray-700" />
                        <Skeleton className="h-4 w-40 bg-gray-700" />
                        <Skeleton className="h-4 w-20 bg-gray-700" />
                        <Skeleton className="h-4 w-20 bg-gray-700" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : dates.length === 0 ? (
            <div className="mx-6 mb-6">
              <Card className="bg-[#121a24] border-0">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
                  <CardTitle className="text-white font-medium text-lg">No Events Found</CardTitle>
                  <div className="h-1 w-28 bg-blue-500"></div>
                </CardHeader>
                <CardContent className="px-6 py-4 text-center">
                  <p className="text-gray-400">No economic events found for the selected filters.</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            dates.map(date => (
              <div key={date} className="mx-6 mb-6">
                <Card className="bg-[#121a24] border-0">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
                    <CardTitle className="text-white font-medium text-lg">{date}</CardTitle>
                    <div className="h-1 w-28 bg-blue-500"></div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-t border-b border-gray-800">
                            <TableHead className="text-gray-400 text-xs uppercase px-6">Time</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Country</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Event</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Impact</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Actual</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Forecast</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Previous</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase pr-6">Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEvents[date].map((event, index) => (
                            <TableRow 
                              key={index} 
                              className="hover:bg-[#1a2536] border-b border-gray-800"
                            >
                              <TableCell className="font-mono text-sm text-gray-300 px-6">
                                {formatTime(event.time)}
                              </TableCell>
                              <TableCell>
                                <CountryDisplay country={event.country} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ImpactIndicator impact={event.impact || 'Medium'} />
                                  <span className={`font-medium ${
                                    event.impact?.toLowerCase() === 'high' 
                                      ? 'text-red-300' 
                                      : 'text-gray-200'
                                  }`}>{event.event}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`
                                    ${event.impact?.toLowerCase() === 'high' ? 'border-red-500 text-red-400' : ''}
                                    ${event.impact?.toLowerCase() === 'medium' ? 'border-amber-500 text-amber-400' : ''}
                                    ${event.impact?.toLowerCase() === 'low' ? 'border-green-500 text-green-400' : ''}
                                    ${!event.impact ? 'border-gray-500 text-gray-400' : ''}
                                  `}
                                >
                                  {event.impact || 'Medium'}
                                </Badge>
                              </TableCell>
                              <TableCell className={`font-mono ${
                                event.actual > event.previous ? 'text-green-400' : 
                                event.actual < event.previous ? 'text-red-400' : 'text-gray-300'
                              }`}>
                                {event.actual ?? '-'}
                              </TableCell>
                              <TableCell className="font-mono text-blue-400">
                                {event.forecast ?? '-'}
                              </TableCell>
                              <TableCell className="font-mono text-gray-400">
                                {event.previous ?? '-'}
                              </TableCell>
                              <TableCell className="pr-6">
                                {event.actual && event.forecast && event.previous && (
                                  <TimelineIndicator 
                                    actual={parseFloat(event.actual)} 
                                    forecast={parseFloat(event.forecast)} 
                                    previous={parseFloat(event.previous)} 
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}