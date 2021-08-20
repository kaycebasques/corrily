# corrily

A [Corrily](https://corrily.com) demo app built on top of Node.js, Express.js, and Stripe Checkout.
Click **Show** > **In a New Window** to try out the app. 
Check out the [Integration guide](https://corrily.readme.io/docs/integration-guide) for more context.

## Forking/customizing the app

* Click **Remix to Edit**.
* Click **New File**, set the filename to `.env`, and the following key-value pairs:
  ```
  CORRILY_API_KEY=...
  STRIPE_API_KEY=...
  STRIPE_WEBHOOK_SECRET=...
  STRIPE_PRODUCT_ID=...
  ```