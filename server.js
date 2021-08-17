const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE);
const nunjucks = require('nunjucks');
// Store user/session information in memory to keep the app simple/minimal.
let sessionData = {};

nunjucks.configure('templates', {
  autoescape: false
});

// TODO: UUIDs https://www.npmjs.com/package/uuid?activeTab=readme

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
    url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/prices'
  });
  const priceData = result.data;
  if (!sessionData[ip]) sessionData[ip] = {};
  sessionData[ip].prices = priceData;
  const renderData = {
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price
  };
  return response.send(nunjucks.render('index.html', renderData));
});

app.post('/email', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const {id} = request.body;
  sessionData[ip].id = id;
  return response.sendFile(`${__dirname}/static/email.html`);
});

app.post('/subscribe', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const id = sessionData[ip].id;
  const {email} = request.body;
  sessionData[ip].email = email;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          product: 'prod_K2Fkw36WcU2GXi',
          unit_amount: sessionData[ip].prices.products[id].integrations.stripe.amount,
          currency: sessionData[ip].prices.currency,
          recurring: {
            interval: id === 'monthly' ? 'month' : 'year'
          }
        }
      }
    ],
    customer_email: email,
    success_url: 'https://corrily.glitch.me/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://corrily.glitch.me/cancel'
  });
  return response.redirect(session.url);
});

app.post('/webhook', async (request, response) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return response.sendStatus(500);
  let event;
  const signature = request.headers['stripe-signature'];
  try {
    event = stripe.webhooks.constructEvent(request.body, signature, secret);
  } catch (error) {
    console.error('⚠️ Webhook signature verification failed.');
    return response.sendStatus(400);
  }
  const data = event.data.object;
  // In this demo we're assuming that there's only one line item.
  // In a production app you should check if you have more than one.
  const item = data.lines ? data.lines.data[0] : data.items.data[0];
  let status;
  const eventType = event.type;
  console.log(eventType); // TODO
  console.log(data); // TODO
  const email = data.customer_email;
  let ip; // TODO lookup the IP address?
  switch (eventType) {
    case 'customer.subscription.created':
      switch (data.status) {
        case 'incomplete':
        case 'incomplete_expired':
          status = 'pending';
          break;
        case 'trialing':
          status = 'trialing';
          break;
        case 'active':
        case 'past_due':
          status = 'active';
          break;
        case 'canceled':
        case 'unpaid':
          status = 'canceled';
          break;
      }
      try {
        await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY
          },
          data: {
            amount: item.price.unit_amount,
            created: item.created,
            currency: item.price.currency.toUpperCase(),
            origin: 'stripe',
            origin_id: item.id,
            product: item.price.recurring.interval === 'month' ? 'monthly' : 'annual',
            status,
            user_id: data.customer
          },
          url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/subscriptions'
        });
      } catch (error) {
        console.error(error);
        return response.sendStatus(500);
      }
      break;
    case 'invoice.paid':
      switch (data.status) {
        case 'draft':
        case 'open':
          status = 'pending';
          break;
        case 'paid':
          status = 'succeeded';
          break;
        case 'uncollectible':
        case 'void':
          status = 'failed';
          break;
      }
      try {
        const r = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY
          },
          data: {
            amount: item.price.unit_amount,
            created: item.created,
            currency: item.price.currency.toUpperCase(),
            origin: 'stripe',
            origin_id: item.id,
            product: item.price.recurring.interval === 'month' ? 'monthly' : 'annual',
            status,
            user_id: data.customer
          },
          url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/charges'
        });
        console.log(r.data); // TODO
      } catch (error) {
        console.error(error);
        return response.sendStatus(500);
      }
      break;
  }
  return response.sendStatus(200);
});

app.listen(8080, () => {
  console.info('Running!');
});