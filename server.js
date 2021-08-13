const express = require('express');
const app = express();
const axios = require('axios');

app.get('/api/price', async (request, response) => {
  const uid = request.query.uid;
  const country = request.query.country;
  const products = request.query.products.split(',');
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: process.env.API_KEY
    },
    data: {
      products: ['monthly'],
      country: 'BR',
      integrations: [
        'stripe'
      ],
      'user_id': 'kayce'
    },
    // TODO: Hardcode to https://client.corrily.com/v1/prices when finished
    url: process.env.URL
  });
  response.json(result.data);
});

app.listen(8080, () => {
  console.log('https://corrily.glitch.me');
});