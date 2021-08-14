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
  // TODO: Notify Corrily of the pending subscription?
  const {ip, id} = request.body;
  console.log(sessionData[ip].products[id].integrations.stripe);
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

app.get('/success', async (request, response) => {
  // TODO: https://stripe.com/docs/testing#cards
  // TODO: Notify Corrily of the completed subscription?
  response.send('/success');
});

app.get('/cancel', async (request, response) => {
  response.send('/cancel');
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
  console.log(priceData.products.annual.integrations.stripe);
  sessionData[ip] = priceData;
  const renderData = {
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price,
    ip
  };
  response.send(nunjucks.render('index.html', renderData));
});

app.post("/webhook", async (request, response) => {
  let data;
  let eventType;
  const webhookSecret = {{'STRIPE_WEBHOOK_SECRET'}}
  if (webhookSecret) {
    let event;
    let signature = request.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return response.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    data = request.body.data;
    eventType = request.body.type;
  }
  switch (eventType) {
      case 'checkout.session.completed':
        break;
      case 'invoice.paid':
        break;
      case 'invoice.payment_failed':
        break;
      default:
    }
  response.sendStatus(200);
});


app.listen(8080, () => {
  console.info('App is running');
});