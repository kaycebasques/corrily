const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
let data = {};

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static'));

app.post('/subscribe', async (request, response) => {
  response.json(request.body);
});

app.get('/api/price', async (request, response) => {
  const {ip, country} = request.query;
  const products = request.query.products.split(',');
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: process.env.API_KEY
    },
    data: {
      ip,
      products,
      country
    },
    // TODO: Hardcode to https://client.corrily.com/v1/prices when finished
    url: process.env.URL
  });
  data[ip] = result.data;
  response.json(result.data);
});

app.listen(8080, () => {
  console.info('App is running');
});