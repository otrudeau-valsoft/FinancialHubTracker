import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, Star } from 'lucide-react';

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
  const [dateRange, setDateRange] = useState<'current' | 'custom'>('current');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState<number | null>(null);
  
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
  const { data: calendarData, isLoading, error } = useQuery({
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

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      <div className="p-6">
        <h1 className="text-3xl font-bold tracking-tight">Economic Calendar</h1>
        <p className="text-gray-400 mt-2">Track important economic events and indicators</p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-6">
        {/* Filter controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-[#161b22] text-gray-300 border-gray-700 hover:bg-[#1f2937]">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#1f2937] border-gray-700 text-gray-200">
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
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
            
            <Select defaultValue="recent">
              <SelectTrigger className="w-[120px] bg-[#161b22] text-gray-300 border-gray-700">
                <SelectValue placeholder="Recent" />
              </SelectTrigger>
              <SelectContent className="bg-[#1f2937] border-gray-700 text-gray-200">
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="importance">Importance</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-[#161b22] text-gray-300 border-gray-700 hover:bg-[#1f2937]">
                  <Star className="h-4 w-4 mr-2" />
                  Impact
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-0 bg-[#1f2937] border-gray-700">
                <div className="p-2">
                  {impacts.map(impact => (
                    <div key={impact.value} className="flex items-center space-x-2 p-1">
                      <Checkbox 
                        id={`impact-filter-${impact.value}`} 
                        checked={selectedImpact.includes(impact.value)}
                        onCheckedChange={() => toggleImpact(impact.value)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label 
                        htmlFor={`impact-filter-${impact.value}`}
                        className="text-sm font-normal cursor-pointer text-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <ImpactIndicator impact={impact.value} />
                          {impact.label}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs 
              defaultValue="current" 
              value={dateRange}
              onValueChange={(value) => setDateRange(value as 'current' | 'custom')}
              className="w-[400px]"
            >
              <TabsList className="bg-[#161b22] text-gray-300">
                <TabsTrigger 
                  value="current"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Current Month
                </TabsTrigger>
                <TabsTrigger 
                  value="custom"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Custom Range
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button variant="outline" className="bg-[#161b22] text-gray-300 border-gray-700 hover:bg-[#1f2937]">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Date selection (custom range) */}
        {dateRange === 'custom' && (
          <Card className="bg-[#161b22] border-gray-700 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigateMonth('prev')}
                    className="bg-[#0d1117] border-gray-700 hover:bg-[#1f2937] text-gray-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Select
                    value={month.toString()}
                    onValueChange={value => setMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px] bg-[#0d1117] border-gray-700 text-gray-300">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-gray-700 text-gray-200">
                      {months.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={year.toString()}
                    onValueChange={value => setYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-[100px] bg-[#0d1117] border-gray-700 text-gray-300">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-gray-700 text-gray-200">
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigateMonth('next')}
                    className="bg-[#0d1117] border-gray-700 hover:bg-[#1f2937] text-gray-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={day ? day.toString() : ""}
                    onValueChange={value => setDay(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-[120px] bg-[#0d1117] border-gray-700 text-gray-300">
                      <SelectValue placeholder="All Days" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-gray-700 text-gray-200">
                      <SelectItem value="">All Days</SelectItem>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={d.toString()}>
                          Day {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Data */}
        <div className="bg-[#161b22] rounded-lg border border-gray-700 shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-6 w-40 bg-gray-700" />
                  <Skeleton className="h-64 w-full bg-gray-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-red-500">
              Error loading calendar data. Please try again later.
            </div>
          ) : dates.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No economic events found for the selected time period.
            </div>
          ) : (
            <div>
              {dates.map(date => {
                const events = filteredEvents[date];
                
                return (
                  <div key={date} className="border-b border-gray-700 last:border-b-0">
                    <div className="px-6 py-3 bg-[#0d1117] text-gray-200 font-semibold text-lg">
                      {date}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Time</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Country</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Event</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase">Impact</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Actual</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Consensus</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Previous</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((event: any, idx: number) => (
                            <tr 
                              key={idx} 
                              className={`${
                                idx % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#1a2435]'
                              } hover:bg-[#202e44] transition-colors`}
                            >
                              <td className="px-6 py-3 whitespace-nowrap font-mono text-gray-300">
                                {formatTime(event.time)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <CountryDisplay country={event.country || 'US'} />
                              </td>
                              <td className="px-6 py-3 font-medium text-gray-200">
                                {event.event}
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <ImpactIndicator impact={event.impact || 'medium'} />
                                  <span className="text-sm text-gray-300">{event.impact || 'Medium'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right">
                                {event.actual !== undefined && event.actual !== null ? (
                                  <div className={`inline-flex px-2 py-1 rounded-md text-sm font-semibold ${
                                    event.actual > event.forecast ? 'bg-green-900 text-green-200' : 
                                    event.actual < event.forecast ? 'bg-red-900 text-red-200' : 
                                    'bg-gray-800 text-gray-300'
                                  }`}>
                                    {event.actual}
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-6 py-3 text-right text-gray-300">
                                {event.forecast || '—'}
                              </td>
                              <td className="px-6 py-3 text-right text-gray-300">
                                {event.previous || '—'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                {(event.actual && event.forecast && event.previous) && 
                                  <TimelineIndicator 
                                    actual={parseFloat(event.actual)} 
                                    forecast={parseFloat(event.forecast)} 
                                    previous={parseFloat(event.previous)} 
                                  />
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Rate limit warning */}
        <div className="text-amber-400 text-xs bg-amber-900/20 rounded p-2 border border-amber-800">
          <strong>Note:</strong> Due to API rate limits (15 requests/month), calendar data is cached to minimize API usage.
          Refresh the page to force a new data fetch if needed.
        </div>
      </div>
    </div>
  );
}