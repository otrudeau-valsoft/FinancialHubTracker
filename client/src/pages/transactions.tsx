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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 mt-1">Track and analyze all portfolio transactions</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="INTL">INTL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue placeholder="Time Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Transactions</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Volume</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-white">${totalVolume.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total P&L</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </p>
                  {totalPnL >= 0 ? <TrendingUp className="ml-2 h-4 w-4 text-green-400" /> : <TrendingDown className="ml-2 h-4 w-4 text-red-400" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Avg P&L %</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${avgPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {avgPnLPercent >= 0 ? '+' : ''}{avgPnLPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Region Distribution */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Regional Distribution</CardTitle>
                <CardDescription>Transaction volume by region</CardDescription>
              </CardHeader>
              <CardContent>
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
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Buy vs Sell */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Buy vs Sell Activity</CardTitle>
                <CardDescription>Transaction count and volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={actionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="action" tick={{ fill: '#9ca3af' }} />
                    <YAxis tick={{ fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    />
                    <Bar dataKey="count" fill="#0A7AFF" name="Count" />
                    <Bar dataKey="volume" fill="#00C853" name="Volume ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Daily Transaction Trend */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Daily Transaction Trends</CardTitle>
              <CardDescription>Transaction volume and P&L over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="volume" stroke="#0A7AFF" strokeWidth={2} name="Volume ($)" />
                  <Line type="monotone" dataKey="pnl" stroke="#00C853" strokeWidth={2} name="P&L ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Transaction Table */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
              <CardDescription>Complete transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-300 font-medium">Date</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Symbol</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Company</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Action</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Quantity</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Price</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Total</th>
                      <th className="text-left p-3 text-slate-300 font-medium">P&L</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-blue-400">{transaction.symbol}</span>
                        </td>
                        <td className="p-3 text-slate-300">{transaction.company}</td>
                        <td className="p-3">
                          <Badge variant={transaction.action === 'BUY' ? 'destructive' : 'default'}>
                            {transaction.action === 'BUY' ? (
                              <ArrowDownRight className="w-3 h-3 mr-1" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                            )}
                            {transaction.action}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-300 font-mono">{transaction.quantity}</td>
                        <td className="p-3 text-slate-300 font-mono">${parseFloat(transaction.price).toFixed(2)}</td>
                        <td className="p-3 text-slate-300 font-mono">${parseFloat(transaction.totalValue).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`font-mono ${
                            parseFloat(transaction.pnlDollar || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {parseFloat(transaction.pnlDollar || '0') >= 0 ? '+' : ''}${parseFloat(transaction.pnlDollar || '0').toFixed(2)}
                          </span>
                          <br />
                          <span className={`font-mono text-xs ${
                            parseFloat(transaction.pnlPercent || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ({parseFloat(transaction.pnlPercent || '0') >= 0 ? '+' : ''}{parseFloat(transaction.pnlPercent || '0').toFixed(2)}%)
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-slate-300 border-slate-600">
                            {transaction.region}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No transactions found for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}