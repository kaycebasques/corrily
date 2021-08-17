const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
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
  console.log('GET /'); // TODO
  console.log('Corrily response'); // TODO
  console.log(result.data); // TODO
  const priceData = result.data;
  if (!sessionData[uuid]) sessionData[uuid] = {};
  sessionData[uuid].ip = ip;
  sessionData[uuid].prices = priceData;
  const renderData = {
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price,
    uuid: uuid
  };
  return response.send(nunjucks.render('index.html', renderData));
});

app.post('/email', async (request, response) => {
  const ip = request.headers['x-forwarded-for'].split(',')[0];
  const {product, uuid} = request.body;
  sessionData[uuid].product = product;
  const renderData = {
    uuid: uuid
  };
  console.log('POST /email'); // TODO
  console.log('Session data'); // TODO
  console.log(sessionData); // TODO
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
          product: 'prod_K2Fkw36WcU2GXi',
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
  return response.redirect(session.url);
});

app.use('/webhook', bodyParser.raw({type: '*/*'}));

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
  // Assuming there's only one line item to keep the app simple/minimal.
  const item = data.lines ? data.lines.data[0] : data.items.data[0];
  let status;
  const eventType = event.type;
  let r; // TODO
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
        r = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY_API_KEY
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
        r = await axios({
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            api_key: process.env.CORRILY_API_KEY
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
      } catch (error) {
        return response.sendStatus(500);
      }
      break;
  }
  console.log('POST /webhook'); // TODO
  console.log({eventType}); // TODO
  console.log(r.data); // TODO
  return response.sendStatus(200);
});

app.listen(8080, () => {
  console.info('Running!');
});