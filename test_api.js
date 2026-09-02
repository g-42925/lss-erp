const http = require('http');
http.get('http://localhost:3000/api/web/reports/product-sell?id=g-42925', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
