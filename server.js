const express = require('express');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE);
const nunjucks = require('nunjucks');
// For simplicity this demo stores user/session information in memory.
// This will not work for your production app.
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
    url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/prices'
  });
  const priceData = result.data;
  sessionData[ip] = priceData;
  const renderData = {
    monthly: priceData.products.monthly.display.price,
    annual: priceData.products.annual.display.price,
    ip
  };
  return response.send(nunjucks.render('index.html', renderData));
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
  // In a real application you should check if you have more than one.
  const item = data.lines ? data.lines.data[0] : data.items.data[0];
  let status;
  const eventType = event.type;
  let r;
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
      // switch (data.status) {
      //   case 'draft':
      //   case 'open':
      //     status = 'pending';
      //     break;
      //   case 'paid':
      //     status = 'succeeded';
      //     break;
      //   case 'uncollectible':
      //   case 'void':
      //     status = 'failed';
      //     break;
      // }
      // try {
      //   r = await axios({
      //     method: 'post',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       api_key: process.env.CORRILY
      //     },
      //     data: {
      //       amount: item.price.unit_amount,
      //       created: item.created,
      //       currency: item.price.currency.toUpperCase(),
      //       origin: 'stripe',
      //       origin_id: item.id,
      //       product: item.price.recurring.interval === 'month' ? 'monthly' : 'annual',
      //       status,
      //       user_id: data.customer
      //     },
      //     url: 'https://mainapi-staging-4hqypo5h6a-uc.a.run.app/v1/charges'
      //   });
      // } catch (error) {
      //   console.error(error);
      //   return response.sendStatus(500);
      // }
      // console.log(r.data);
      break;
  }
  return response.sendStatus(200);
});

app.listen(8080, () => {
  console.info('https://corrily.glitch.me is running');
});