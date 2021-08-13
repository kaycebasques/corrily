(async () => {
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  const priceUrl = 
      `/api/price?ip=${ipData.query}&products=annual,monthly&country=${ipData.countryCode}`;
  const priceResponse = await fetch(priceUrl);
  const priceData = await priceResponse.json();
  document.querySelector('#monthly').textContent =
      `Monthly: ${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
  document.querySelector('#annual').textContent =
      `Annual: ${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`;
})();
