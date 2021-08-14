const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE);
let data = {};

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static'));

app.post('/subscribe', async (request, response) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: request.body.id,
        quantity: 1,
        price_data: {
          unit_amount: request.body.price,
          currency: request.body.currency,
          recurring: {
            interval: request.body.interval
          }
        }
      }
    ],
    success_url: 'https://corrily.glitch.me/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://corrily.glitch.me/cancel'
  });
  response.redirect(session.url);
});

app.get('/api/price', async (request, response) => {
  const {ip, country} = request.query;
  const products = request.query.products.split(',');
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: process.env.CORRILY
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