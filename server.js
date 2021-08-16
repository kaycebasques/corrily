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

app.use('/webhook', bodyParser.raw({type: '*/*'}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static', {
  extensions: ['html']
}));

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
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price,
    ip
  };
  response.send(nunjucks.render('index.html', renderData));
});

app.post('/subscribe', async (request, response) => {
  const {ip, id} = request.body;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          product: 'prod_K2Fkw36WcU2GXi',
          unit_amount: sessionData[ip].products[id].integrations.stripe.amount,
          currency: sessionData[ip].currency,
          recurring: {
            interval: id === 'monthly' ? 'month' : 'year'
          }
        }
      }
    ],
    success_url: 'https://corrily.glitch.me/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://corrily.glitch.me/cancel'
  });
  response.redirect(session.url);
});

app.post('/webhook', async (request, response) => {
  let data;
  let eventType;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return response.sendStatus(500);
  let event;
  const signature = request.headers['stripe-signature'];
  try {
    event = stripe.webhooks.constructEvent(request.body, signature, secret);
  } catch (error) {
    console.error('⚠️ Webhook signature verification failed.');
    console.log(error);
    return response.sendStatus(400);
  }
  data = event.data;
  eventType = event.type;
  console.log({data, eventType});
  return response.sendStatus(200);
});

app.listen(8080, () => {
  console.info('https://corrily.glitch.me is running');
});