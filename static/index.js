(async () => {
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  const priceUrl = 
      `/api/price?ip=${ipData.query}&products=annual,monthly&country=${ipData.countryCode}`;
  const priceResponse = await fetch(priceUrl);
  const priceData = await priceResponse.json();
  const displayPrice = 
      `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
  document.querySelector('#price').textContent = displayPrice;
})();
