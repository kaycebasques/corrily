(async () => {
  async function updatePrice(ip, countryCode) {
    const priceUrl = 
        `/api/price?ip=${ipData.query}&products=annual,monthly&country=${ipData.countryCode}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    document.querySelector('#monthly').textContent =
        `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
    document.querySelector('#annual').textContent =
        `${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`; 
  }
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  const ip = ipData.query;
  updatePrice(ip, ipData.countryCode);
  // document.querySelector('#country').addEventListener('input', event => {
  //  if (event.target.value.length !== 2) return;
  //  updatePrice(ip, event.target.value);
  // });
})();
