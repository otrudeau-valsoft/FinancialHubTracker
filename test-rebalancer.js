// Test script to verify Rebalancer backend communication
const fetch = require('node-fetch');

async function testRebalancer() {
  try {
    const response = await fetch('http://localhost:5000/api/portfolios/USD/database-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        updates: [],
        newRows: [
          {
            symbol: "AAPL",
            company: "Apple Inc", 
            stock_type: "Comp",
            rating: "1",
            quantity: "10",
            purchase_price: "150.00",
            sector: "Technology"
          }
        ],
        deletions: [53]
      })
    });

    const result = await response.json();
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRebalancer();