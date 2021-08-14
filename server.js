const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE);
const nunjucks = require('nunjucks');
let sessionData = {};

nunjucks.configure('templates', {
  autoescape: false
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static'));

app.post('/subscribe', async (request, response) => {
  const ip = request.body.ip;
  const productId = request.body.interval === 'month' ? 'monthly' : 'year';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          product: request.body.id,
          unit_amount: sessionData[ip].products[productId].price,
          currency: sessionData[ip].currency,
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

app.get('/', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: process.env.CORRILY
    },
    data: {
      products: ['monthly', 'annual'],
      ip
    },
    // TODO: Hardcode to https://client.corrily.com/v1/prices when finished
    url: process.env.URL
  });
  const priceData = result.data;
  sessionData[ip] = priceData;
  const renderData = {
    monthly: `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`,
    annual: `${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`,
    ip
  };
  response.send(nunjucks.render('index.html', renderData));
});

app.listen(8080, () => {
  console.info('App is running');
});