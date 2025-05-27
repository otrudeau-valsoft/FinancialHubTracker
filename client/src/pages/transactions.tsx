import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, Activity, Calendar, Target } from 'lucide-react';
import { Transaction } from '@shared/schema';

export default function TransactionsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: selectedRegion === 'all' ? ['/api/transactions'] : ['/api/transactions/region', selectedRegion],
    enabled: true,
  });

  // Filter transactions by time
  const getFilteredTransactions = () => {
    if (timeFilter === 'all') return transactions;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      default:
        return transactions;
    }
    
    return transactions.filter(t => new Date(t.createdAt) >= cutoffDate);
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate metrics
  const totalTransactions = filteredTransactions.length;
  const buyTransactions = filteredTransactions.filter(t => t.action === 'BUY');
  const sellTransactions = filteredTransactions.filter(t => t.action === 'SELL');
  
  const totalVolume = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.totalValue), 0);
  const totalPnL = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.pnlDollar || '0')), 0);
  const avgPnLPercent = filteredTransactions.length > 0 
    ? filteredTransactions.reduce((sum, t) => sum + parseFloat(t.pnlPercent || '0'), 0) / filteredTransactions.length 
    : 0;

  // Prepare chart data
  const regionData = filteredTransactions.reduce((acc: any[], t) => {
    const existing = acc.find(item => item.region === t.region);
    if (existing) {
      existing.count += 1;
      existing.volume += parseFloat(t.totalValue);
      existing.pnl += parseFloat(t.pnlDollar || '0');
    } else {
      acc.push({
        region: t.region,
        count: 1,
        volume: parseFloat(t.totalValue),
        pnl: parseFloat(t.pnlDollar || '0')
      });
    }
    return acc;
  }, []);

  const actionData = [
    { action: 'BUY', count: buyTransactions.length, volume: buyTransactions.reduce((sum, t) => sum + parseFloat(t.totalValue), 0) },
    { action: 'SELL', count: sellTransactions.length, volume: sellTransactions.reduce((sum, t) => sum + parseFloat(t.totalValue), 0) }
  ];

  // Daily transaction trend
  const dailyData = filteredTransactions.reduce((acc: any[], t) => {
    const date = new Date(t.createdAt).toISOString().split('T')[0];
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count += 1;
      existing.volume += parseFloat(t.totalValue);
      existing.pnl += parseFloat(t.pnlDollar || '0');
    } else {
      acc.push({
        date,
        count: 1,
        volume: parseFloat(t.totalValue),
        pnl: parseFloat(t.pnlDollar || '0')
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const COLORS = ['#0A7AFF', '#00C853', '#FF3D00', '#9C27B0', '#FF9800'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">TRANSACTIONS</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#38AAFD]"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-32 h-8 bg-[#0B1728] border border-[#1A304A] text-[#EFEFEF] font-mono text-xs">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1728] border-[#1A304A]">
                <SelectItem value="all" className="text-[#EFEFEF] font-mono text-xs">All Regions</SelectItem>
                <SelectItem value="USD" className="text-[#EFEFEF] font-mono text-xs">USD</SelectItem>
                <SelectItem value="CAD" className="text-[#EFEFEF] font-mono text-xs">CAD</SelectItem>
                <SelectItem value="INTL" className="text-[#EFEFEF] font-mono text-xs">INTL</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32 h-8 bg-[#0B1728] border border-[#1A304A] text-[#EFEFEF] font-mono text-xs">
                <SelectValue placeholder="Time Filter" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1728] border-[#1A304A]">
                <SelectItem value="all" className="text-[#EFEFEF] font-mono text-xs">All Time</SelectItem>
                <SelectItem value="7d" className="text-[#EFEFEF] font-mono text-xs">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-[#EFEFEF] font-mono text-xs">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="text-[#EFEFEF] font-mono text-xs">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-[#0A1524] border border-[#1A304A] p-3 sm:p-4">
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-[#38AAFD] mr-3" />
            <div>
              <p className="text-[10px] font-mono text-[#7A8999] uppercase tracking-wide">TOTAL TRANSACTIONS</p>
              <div className="flex items-center">
                <p className="text-lg sm:text-xl font-mono text-[#EFEFEF]">{totalTransactions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1524] border border-[#1A304A] p-3 sm:p-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-[#4CAF50] mr-3" />
            <div>
              <p className="text-[10px] font-mono text-[#7A8999] uppercase tracking-wide">TOTAL VOLUME</p>
              <div className="flex items-center">
                <p className="text-lg sm:text-xl font-mono text-[#EFEFEF]">${totalVolume.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1524] border border-[#1A304A] p-3 sm:p-4">
          <div className="flex items-center">
            <Target className="h-5 w-5 text-[#9C27B0] mr-3" />
            <div>
              <p className="text-[10px] font-mono text-[#7A8999] uppercase tracking-wide">TOTAL P&L</p>
              <div className="flex items-center">
                <p className={`text-lg sm:text-xl font-mono ${totalPnL >= 0 ? 'text-[#4CAF50]' : 'text-[#FF3D00]'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </p>
                {totalPnL >= 0 ? <TrendingUp className="ml-2 h-3 w-3 text-[#4CAF50]" /> : <TrendingDown className="ml-2 h-3 w-3 text-[#FF3D00]" />}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A1524] border border-[#1A304A] p-3 sm:p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-[#FF9800] mr-3" />
            <div>
              <p className="text-[10px] font-mono text-[#7A8999] uppercase tracking-wide">AVG P&L %</p>
              <div className="flex items-center">
                <p className={`text-lg sm:text-xl font-mono ${avgPnLPercent >= 0 ? 'text-[#4CAF50]' : 'text-[#FF3D00]'}`}>
                  {avgPnLPercent >= 0 ? '+' : ''}{avgPnLPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-[#0B1728] border border-[#1A304A] h-8">
          <TabsTrigger value="overview" className="text-[#7A8999] font-mono text-xs data-[state=active]:text-[#EFEFEF] data-[state=active]:bg-[#1A304A]">OVERVIEW</TabsTrigger>
          <TabsTrigger value="analytics" className="text-[#7A8999] font-mono text-xs data-[state=active]:text-[#EFEFEF] data-[state=active]:bg-[#1A304A]">ANALYTICS</TabsTrigger>
          <TabsTrigger value="history" className="text-[#7A8999] font-mono text-xs data-[state=active]:text-[#EFEFEF] data-[state=active]:bg-[#1A304A]">TRANSACTION HISTORY</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Region Distribution */}
            <div className="bg-[#0A1524] border border-[#1A304A] p-4">
              <div className="mb-4">
                <h3 className="text-[#EFEFEF] font-mono text-sm tracking-wide">REGIONAL DISTRIBUTION</h3>
                <p className="text-[#7A8999] font-mono text-xs mt-1">Transaction volume by region</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ region, volume }) => `${region}: $${volume.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="volume"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1524',
                      border: '1px solid #1A304A',
                      borderRadius: '4px',
                      color: '#EFEFEF',
                      fontSize: '11px',
                      fontFamily: 'mono'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Buy vs Sell */}
            <div className="bg-[#0A1524] border border-[#1A304A] p-4">
              <div className="mb-4">
                <h3 className="text-[#EFEFEF] font-mono text-sm tracking-wide">BUY VS SELL ACTIVITY</h3>
                <p className="text-[#7A8999] font-mono text-xs mt-1">Transaction count and volume</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" />
                  <XAxis dataKey="action" tick={{ fill: '#7A8999', fontSize: 11, fontFamily: 'mono' }} />
                  <YAxis tick={{ fill: '#7A8999', fontSize: 11, fontFamily: 'mono' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1524',
                      border: '1px solid #1A304A',
                      borderRadius: '4px',
                      color: '#EFEFEF',
                      fontSize: '11px',
                      fontFamily: 'mono'
                    }}
                  />
                  <Bar dataKey="count" fill="#38AAFD" name="Count" />
                  <Bar dataKey="volume" fill="#4CAF50" name="Volume ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Daily Transaction Trend */}
          <div className="bg-[#0A1524] border border-[#1A304A] p-4">
            <div className="mb-4">
              <h3 className="text-[#EFEFEF] font-mono text-sm tracking-wide">DAILY TRANSACTION TRENDS</h3>
              <p className="text-[#7A8999] font-mono text-xs mt-1">Transaction volume and P&L over time</p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#7A8999', fontSize: 11, fontFamily: 'mono' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tick={{ fill: '#7A8999', fontSize: 11, fontFamily: 'mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1524',
                    border: '1px solid #1A304A',
                    borderRadius: '4px',
                    color: '#EFEFEF',
                    fontSize: '11px',
                    fontFamily: 'mono'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend 
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'mono',
                    color: '#7A8999'
                  }}
                />
                <Line type="monotone" dataKey="volume" stroke="#38AAFD" strokeWidth={2} name="Volume ($)" />
                <Line type="monotone" dataKey="pnl" stroke="#4CAF50" strokeWidth={2} name="P&L ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Transaction Table */}
          <div className="bg-[#0A1524] border border-[#1A304A] p-4">
            <div className="mb-4">
              <h3 className="text-[#EFEFEF] font-mono text-sm tracking-wide">RECENT TRANSACTIONS</h3>
              <p className="text-[#7A8999] font-mono text-xs mt-1">Complete transaction history</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1A304A]">
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">DATE</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">SYMBOL</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">COMPANY</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">ACTION</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">QUANTITY</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">PRICE</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">TOTAL</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">P&L</th>
                    <th className="text-left p-2 text-[#7A8999] font-mono uppercase tracking-wide">REGION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[#1A304A]/50 hover:bg-[#1A304A]/20">
                      <td className="p-2 text-[#EFEFEF] font-mono">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-[#38AAFD]">{transaction.symbol}</span>
                      </td>
                      <td className="p-2 text-[#EFEFEF] font-mono text-xs">{transaction.company}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                          transaction.action === 'BUY' 
                            ? 'bg-[#FF3D00]/20 text-[#FF3D00]' 
                            : 'bg-[#4CAF50]/20 text-[#4CAF50]'
                        }`}>
                          {transaction.action === 'BUY' ? (
                            <ArrowDownRight className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {transaction.action}
                        </span>
                      </td>
                      <td className="p-2 text-[#EFEFEF] font-mono">{transaction.quantity}</td>
                      <td className="p-2 text-[#EFEFEF] font-mono">${parseFloat(transaction.price).toFixed(2)}</td>
                      <td className="p-2 text-[#EFEFEF] font-mono">${parseFloat(transaction.totalValue).toLocaleString()}</td>
                      <td className="p-2">
                        <span className={`font-mono ${
                          parseFloat(transaction.pnlDollar || '0') >= 0 ? 'text-[#4CAF50]' : 'text-[#FF3D00]'
                        }`}>
                          {parseFloat(transaction.pnlDollar || '0') >= 0 ? '+' : ''}${parseFloat(transaction.pnlDollar || '0').toFixed(2)}
                        </span>
                        <br />
                        <span className={`font-mono text-xs ${
                          parseFloat(transaction.pnlPercent || '0') >= 0 ? 'text-[#4CAF50]' : 'text-[#FF3D00]'
                        }`}>
                          ({parseFloat(transaction.pnlPercent || '0') >= 0 ? '+' : ''}{parseFloat(transaction.pnlPercent || '0').toFixed(2)}%)
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="inline-flex px-1.5 py-0.5 bg-[#1A304A] text-[#EFEFEF] rounded text-xs font-mono">
                          {transaction.region}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-[#7A8999] font-mono text-xs">
                  NO TRANSACTIONS FOUND FOR THE SELECTED FILTERS.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}