const express = require('express');
const app = express();
const API_KEY = 'b82fd0fa-2a1b-4226-b6c0-22884ae97f84';
const axios = require('axios');

app.get('/', (request, response) => {
  response.send('JAYCE');
});

app.get('/test', async (request, response) => {
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: API_KEY
    },
    data: {
      products: ['monthly'],
      country: 'BR',
      integrations: [
        'stripe'
      ],
      'user_id': 'kayce'
    },
    url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/prices'
  });
  response.json(result.data);
});

app.listen(8080, () => {
  console.log(process.API_KEY);
});