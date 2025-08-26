import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ExternalLink, BookOpen, TestTube, Code, Zap } from 'lucide-react';

export default function SwaggerPage() {
  const swaggerUrl = '/api-docs';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
                <p className="text-gray-600">Interactive Swagger documentation for AlphaGen Portfolio Management System</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <TestTube className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Test Endpoints</p>
                  <p className="text-sm text-green-700">Try all APIs directly</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Code className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">View Schemas</p>
                  <p className="text-sm text-blue-700">Complete data models</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Zap className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Production Ready</p>
                  <p className="text-sm text-purple-700">Live environment testing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Portfolio APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Get portfolio stocks by region</li>
              <li>• Current prices and performance</li>
              <li>• Multi-region support (USD/CAD/INTL)</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Scheduler APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Job status and management</li>
              <li>• Manual job triggers</li>
              <li>• Audit logs and history</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Market Data APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Real-time market indices</li>
              <li>• Historical price data</li>
              <li>• ETF holdings information</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Performance APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Performance history tracking</li>
              <li>• Technical indicators (RSI, MACD)</li>
              <li>• Portfolio analytics</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Monitoring APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• System health checks</li>
              <li>• Data quality metrics</li>
              <li>• Alert management</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Matrix Rules APIs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Decision matrix rules</li>
              <li>• Cash management</li>
              <li>• Trading signals</li>
            </ul>
          </div>
        </div>

        {/* Embedded Swagger UI */}
        <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Interactive API Documentation</h2>
            </div>
            <a 
              href={swaggerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open in New Tab
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          <div className="h-screen">
            <iframe
              src={swaggerUrl}
              className="w-full h-full border-0"
              title="AlphaGen API Documentation"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        {/* Usage Notes */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Production Usage Notes</h3>
          <div className="text-sm text-amber-800 space-y-2">
            <p>• This documentation reflects the live production APIs currently running</p>
            <p>• Test endpoints directly using the "Try it out" buttons in Swagger UI</p>
            <p>• All responses show real data from your PostgreSQL database</p>
            <p>• Scheduler operations can be monitored through the audit logs endpoint</p>
            <p>• Rate limits are in place to protect against API abuse</p>
          </div>
        </div>
      </div>
    </div>
  );
}