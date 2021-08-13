const express = require('express');
const app = express();
const axios = require('axios');

app.get('/', async (request, response) => {
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
    // url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/prices'
    url: 'https://client.corrily.com/v1/prices'
  });
  response.json(result.data);
});

app.listen(8080, () => {
  console.log(process.API_KEY);
});