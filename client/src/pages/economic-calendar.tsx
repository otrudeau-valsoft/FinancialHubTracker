import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/page-container';

// Icons for different event significance and impact
const ImpactIndicator = ({ impact }: { impact: string }) => {
  const getColor = () => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
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

// Component to display the actual value, forecast, previous, etc.
const ValueDisplay = ({ 
  actual, 
  forecast, 
  previous 
}: { 
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
}) => {
  return (
    <div className="flex flex-col text-sm">
      {actual !== null && actual !== undefined && (
        <div className="font-semibold">
          {actual}
        </div>
      )}
      <div className="flex gap-2 text-xs text-muted-foreground">
        {forecast !== null && forecast !== undefined && (
          <div>F: {forecast}</div>
        )}
        {previous !== null && previous !== undefined && (
          <div>P: {previous}</div>
        )}
      </div>
    </div>
  );
};

export default function EconomicCalendarPage() {
  const [dateRange, setDateRange] = useState<'current' | 'custom'>('current');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState<number | null>(null);
  
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

  // Fetch economic calendar data
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['economic-calendar', dateRange, year, month, day],
    queryFn: async () => {
      let url = '/api/economic-calendar';
      
      if (dateRange === 'current') {
        url += '/current';
      } else {
        url += `?year=${year}&month=${month}${day ? `&day=${day}` : ''}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch economic calendar data');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  const dates = calendarData?.data ? Object.keys(calendarData.data).sort() : [];

  return (
    <PageContainer>
      <PageHeader
        title="Economic Calendar"
        description="Track important economic events and indicators"
      />

      <div className="flex flex-col gap-4">
        {/* Date Range Selection */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Range
              </CardTitle>
              
              <Tabs 
                defaultValue="current" 
                value={dateRange}
                onValueChange={(value) => setDateRange(value as 'current' | 'custom')}
                className="w-[400px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="current">Current Month</TabsTrigger>
                  <TabsTrigger value="custom">Custom Range</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Select
                    value={month.toString()}
                    onValueChange={value => setMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
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
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={day ? day.toString() : ""}
                    onValueChange={value => setDay(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="All Days" />
                    </SelectTrigger>
                    <SelectContent>
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
            )}
          </CardContent>
        </Card>

        {/* Calendar Data */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle>Economic Events</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-red-500">
                Error loading calendar data. Please try again later.
              </div>
            ) : dates.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No economic events found for the selected time period.
              </div>
            ) : (
              <div className="space-y-6">
                {dates.map(date => {
                  const events = calendarData.data[date];
                  
                  return (
                    <div key={date} className="space-y-2">
                      <h3 className="text-lg font-semibold border-b pb-1">
                        {date}
                      </h3>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Time</TableHead>
                              <TableHead className="w-16">Country</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead className="w-32">Impact</TableHead>
                              <TableHead className="w-32 text-right">Actual</TableHead>
                              <TableHead className="w-32 text-right">Forecast</TableHead>
                              <TableHead className="w-32 text-right">Previous</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {events.map((event: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">
                                  {formatTime(event.time)}
                                </TableCell>
                                <TableCell>
                                  <CountryDisplay country={event.country || 'US'} />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {event.event}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <ImpactIndicator impact={event.impact || 'medium'} />
                                    <span className="text-sm">{event.impact || 'Medium'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {event.actual !== undefined && event.actual !== null ? (
                                    <Badge variant={
                                      event.actual > event.forecast ? "success" : 
                                      event.actual < event.forecast ? "destructive" : 
                                      "outline"
                                    }>
                                      {event.actual}
                                    </Badge>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {event.forecast || '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {event.previous || '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}