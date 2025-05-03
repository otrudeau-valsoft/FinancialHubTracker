import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, Star, FileDown, RefreshCw } from 'lucide-react';

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
      <PageHeader
        title="Economic Calendar"
        description="Track important economic events and indicators"
      />

      <div className="grid grid-cols-1 gap-6 p-6">
        {/* Main control bar */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filters button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#1C2938] text-gray-300 border-gray-700 hover:bg-[#283141]">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#1C2938] border-gray-700 text-gray-200">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-gray-300">Countries</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {countries.map(country => (
                        <div key={country.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`country-${country.value}`} 
                            checked={selectedCountries.includes(country.value)}
                            onCheckedChange={() => toggleCountry(country.value)}
                            className="data-[state=checked]:bg-[#0A7AFF] data-[state=checked]:border-[#0A7AFF]"
                          />
                          <Label 
                            htmlFor={`country-${country.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {country.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-gray-300">Impact</h4>
                    <div className="flex flex-col gap-2">
                      {impacts.map(impact => (
                        <div key={impact.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`impact-${impact.value}`} 
                            checked={selectedImpact.includes(impact.value)}
                            onCheckedChange={() => toggleImpact(impact.value)}
                            className="data-[state=checked]:bg-[#0A7AFF] data-[state=checked]:border-[#0A7AFF]"
                          />
                          <Label 
                            htmlFor={`impact-${impact.value}`}
                            className="text-sm font-normal cursor-pointer"
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
                    <h4 className="font-medium mb-2 text-gray-300">Categories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map(category => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`category-${category.value}`} 
                            checked={selectedCategories.includes(category.value)}
                            onCheckedChange={() => toggleCategory(category.value)}
                            className="data-[state=checked]:bg-[#0A7AFF] data-[state=checked]:border-[#0A7AFF]"
                          />
                          <Label 
                            htmlFor={`category-${category.value}`}
                            className="text-sm font-normal cursor-pointer"
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

            {/* Time period buttons - styled to match portfolio page */}
            <div>
              <div className="flex h-9 rounded overflow-hidden border border-gray-700">
                <button 
                  className={`px-3 h-full ${activeTab === '1W' ? 'bg-[#0A7AFF] text-white' : 'bg-[#1C2938] text-gray-300 hover:bg-[#283141]'}`}
                  onClick={() => setActiveTab('1W')}
                >
                  1W
                </button>
                <button 
                  className={`px-3 h-full ${activeTab === '1M' ? 'bg-[#0A7AFF] text-white' : 'bg-[#1C2938] text-gray-300 hover:bg-[#283141]'}`}
                  onClick={() => setActiveTab('1M')}
                >
                  1M
                </button>
                <button 
                  className={`px-3 h-full ${activeTab === 'YTD' ? 'bg-[#0A7AFF] text-white' : 'bg-[#1C2938] text-gray-300 hover:bg-[#283141]'}`}
                  onClick={() => setActiveTab('YTD')}
                >
                  YTD
                </button>
                <button 
                  className={`px-3 h-full ${activeTab === '1Y' ? 'bg-[#0A7AFF] text-white' : 'bg-[#1C2938] text-gray-300 hover:bg-[#283141]'}`}
                  onClick={() => setActiveTab('1Y')}
                >
                  1Y
                </button>
              </div>
            </div>

            {/* Custom range selector */}
            <div className="flex items-center gap-2 ml-2">
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(value as 'current' | 'custom')}
              >
                <SelectTrigger className="bg-[#1C2938] text-gray-300 border-gray-700 w-[150px] h-9">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent className="bg-[#1C2938] border-gray-700 text-gray-200">
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRange === 'custom' && (
                <>
                  <Select
                    value={year.toString()}
                    onValueChange={(value) => setYear(parseInt(value))}
                  >
                    <SelectTrigger className="bg-[#1C2938] text-gray-300 border-gray-700 w-[100px] h-9">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C2938] border-gray-700 text-gray-200">
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={month.toString()}
                    onValueChange={(value) => setMonth(parseInt(value))}
                  >
                    <SelectTrigger className="bg-[#1C2938] text-gray-300 border-gray-700 w-[130px] h-9">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C2938] border-gray-700 text-gray-200">
                      {months.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {dateRange === 'custom' && (
              <div className="flex items-center bg-[#1C2938] border border-gray-700 rounded-md overflow-hidden h-9">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                  className="text-gray-300 hover:text-white hover:bg-[#283141] rounded-none h-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                  className="text-gray-300 hover:text-white hover:bg-[#283141] rounded-none h-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <Button 
              size="sm" 
              className="bg-[#0A7AFF] hover:bg-blue-700 text-white h-9"
              onClick={forceRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#1C2938] text-gray-300 border-gray-700 hover:bg-[#283141] h-9"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* API limit note with same styling as matrix rule alerts from portfolio */}
        <Card className="border-amber-700 bg-[#1C2938] border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
            <CardTitle className="text-amber-400 font-medium text-sm tracking-wide">API USAGE NOTE</CardTitle>
            <div className="h-1 w-28 bg-amber-500"></div>
          </CardHeader>
          <CardContent className="px-6 py-2">
            <p className="text-sm text-amber-500">Due to API rate limits (15 requests/month), calendar data is cached to minimize API usage. Use the Refresh Data button to force a new data fetch if needed.</p>
          </CardContent>
        </Card>
        
        {/* Error message using same styling as matrix rule alerts box */}
        {error && (
          <Card className="border-red-700 bg-[#1C2938] border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
              <CardTitle className="text-red-400 font-medium text-sm tracking-wide">ERROR</CardTitle>
              <div className="h-1 w-28 bg-red-500"></div>
            </CardHeader>
            <CardContent className="px-6 py-2">
              <p className="text-sm text-red-400">Error loading calendar data. Please try again later.</p>
            </CardContent>
          </Card>
        )}
        
        {/* Events table with portfolio table styling */}
        <div className="space-y-8">
          {isLoading ? (
            <Card className="bg-[#1C2938] border-gray-700 border">
              <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Calendar Events</CardTitle>
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
          ) : dates.length === 0 ? (
            <Card className="bg-[#1C2938] border-gray-700 border">
              <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Calendar Events</CardTitle>
                <div className="h-1 w-28 bg-blue-500"></div>
              </CardHeader>
              <CardContent className="px-6 py-4 text-center">
                <p className="text-gray-400">No economic events found for the selected filters.</p>
              </CardContent>
            </Card>
          ) : (
            dates.map(date => (
              <Card key={date} className="bg-[#1C2938] border-gray-700 border overflow-hidden">
                <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-medium text-white">{date}</CardTitle>
                  <div className="h-1 w-28 bg-blue-500"></div>
                </CardHeader>
                <CardContent className="px-0 pt-0 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="w-[80px] text-gray-400 text-xs uppercase">Time</TableHead>
                        <TableHead className="w-[80px] text-gray-400 text-xs uppercase">Country</TableHead>
                        <TableHead className="text-gray-400 text-xs uppercase">Event</TableHead>
                        <TableHead className="w-[100px] text-gray-400 text-xs uppercase">Impact</TableHead>
                        <TableHead className="w-[100px] text-gray-400 text-xs uppercase">Actual</TableHead>
                        <TableHead className="w-[100px] text-gray-400 text-xs uppercase">Forecast</TableHead>
                        <TableHead className="w-[100px] text-gray-400 text-xs uppercase">Previous</TableHead>
                        <TableHead className="w-[100px] text-gray-400 text-xs uppercase">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents[date].map((event, index) => (
                        <TableRow key={index} className="border-gray-800 hover:bg-[#283141]">
                          <TableCell className="font-mono text-sm text-gray-300">
                            {formatTime(event.time)}
                          </TableCell>
                          <TableCell>
                            <CountryDisplay country={event.country} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ImpactIndicator impact={event.impact || 'Medium'} />
                              <span className="font-medium text-gray-200">{event.event}</span>
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
                          <TableCell>
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}