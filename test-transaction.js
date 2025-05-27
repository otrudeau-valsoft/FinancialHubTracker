// Simple test to create a transaction directly
const { createTransaction } = require('./server/routes/transactions');

// Mock a simple request
const mockReq = {
  body: {
    symbol: 'AAPL',
    company: 'Apple Inc',
    action: 'BUY',
    quantity: '10',
    price: '150.50',
    region: 'USD',
    totalValue: '1505.00'
  }
};

const mockRes = {
  status: (code) => ({ json: (data) => console.log('Response:', code, data) }),
  json: (data) => console.log('Response:', data)
};

console.log('Testing transaction creation...');
createTransaction(mockReq, mockRes);