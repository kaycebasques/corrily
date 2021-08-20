const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const nunjucks = require('nunjucks');
const uuidv4 = require('uuid').v4;

// Store user/session information in memory to keep the app simple/minimal.
let sessionData = {};

nunjucks.configure('templates', {
  autoescape: false
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('static', {
  extensions: ['html']
}));
app.use('/webhook', bodyParser.raw({type: '*/*'}));

app.get('/', async (request, response) => {
  const uuid = uuidv4();
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const result = await axios({
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      api_key: process.env.CORRILY_API_KEY
    },
    data: {
      products: ['monthly', 'annual'],
      ip,
      user_id: uuid
    },
    url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/prices'
  });
  const priceData = result.data;
  if (!sessionData[uuid]) sessionData[uuid] = {};
  sessionData[uuid].ip = ip;
  sessionData[uuid].prices = priceData;
  const renderData = {
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price,
    uuid: uuid
  };
  console.log('GET /');
  console.log('Corrily price data:');
  console.log(priceData);
  console.log('Session data:');
  console.log(sessionData);
  return response.send(nunjucks.render('index.html', renderData));
});

app.post('/email', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const {product, uuid} = request.body;
  sessionData[uuid].product = product;
  const renderData = {
    uuid: uuid
  };
  console.log('POST /email');
  console.log('Session data');
  console.log(sessionData);
  return response.send(nunjucks.render('email.html', renderData));
});

app.post('/subscribe', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const {email, uuid} = request.body;
  const product = sessionData[uuid].product;
  sessionData[uuid].email = email;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          product: process.env.STRIPE_PRODUCT_ID,
          unit_amount: sessionData[uuid].prices.products[product].integrations.stripe.amount,
          currency: sessionData[uuid].prices.currency,
          recurring: {
            interval: product === 'monthly' ? 'month' : 'year'
          }
        }
      }
    ],
    customer_email: email,
    success_url: 'https://corrily.glitch.me/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://corrily.glitch.me/cancel'
  });
  console.log('POST /subscribe');
  console.log('Stripe session data:');
  console.log(session);
  console.log('Session data:');
  console.log(sessionData);
  return response.redirect(session.url);
});

app.post('/webhook', async (request, response) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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
  // Assume there's only one line item to keep the app simple/minimal.
  const item = data.lines ? data.lines.data[0] : data.items.data[0];
  let status;
  const eventType = event.type;
  const email = data.customer_email;
  
  let corrilyResponse;
  function map(status) {
    switch (status) {
      case 'incomplete':
      case 'incomplete_expired':
        return 'pending';
      case 'trialing':
        return 'trialing';
      case 'active':
      case 'past_due':
        return 'active';
      case 'canceled':
      case 'unpaid':
        return 'canceled';
    }
  }
  let uuid;
  if (data.customer) {
    const {email} = await stripe.customers.retrieve(data.customer);
    for (const key in sessionData) {
      if (sessionData[key].email === email) uuid = key;
    }
  }
  if (data.customer_email) {
    for (const key in sessionData) {
      if (sessionData[key].email === data.customer_email) uuid = key;
    }
  }
  switch (eventType) {
    case 'customer.subscription.created':
      try {
        corrilyResponse = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY_API_KEY
          },
          data: {
            amount: item.price.unit_amount,
            created: data.created,
            currency: item.price.currency.toUpperCase(),
            origin: 'stripe',
            origin_id: data.id,
            product: item.price.recurring.interval === 'month' ? 'monthly' : 'annual',
            status: map(data.status),
            user_id: uuid
          },
          url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/subscriptions'
        });
      } catch (error) {
        console.error(error);
        return response.sendStatus(500);
      }
      break;
    case 'customer.subscription.updated':
      const base = 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/subscriptions';
      const url = `${base}/${uuid}/stripe/${data.id}`;
      try {
        corrilyResponse = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY_API_KEY
          },
          data: {
            amount: item.price.unit_amount,
            currency: item.price.currency.toUpperCase(),
            status: map(data.status),
            created: data.created
          },
          url
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
        corrilyResponse = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY_API_KEY
          },
          data: {
            amount: item.price.unit_amount,
            created: data.created,
            currency: item.price.currency.toUpperCase(),
            origin: 'stripe',
            origin_id: data.id,
            product: item.price.recurring.interval === 'month' ? 'monthly' : 'annual',
            status,
            user_id: uuid
          },
          url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/charges'
        });
      } catch (error) {
        console.error(error.response.data);
        console.log(data);
        return response.sendStatus(500);
      }
      break;
  }
  console.log('POST /webhook');
  console.log(`Event type: ${eventType}`);
  if (data) {
    console.log('Event data:');
    console.log(data);
  }
  if (corrilyResponse && corrilyResponse.data) {
    console.log('Corrily response data:');
    console.log(corrilyResponse.data);
  }
  return response.sendStatus(200);
});

app.listen(8080, () => {
  console.info('🚀');
});