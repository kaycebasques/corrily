(async () => {
  async function updatePrice(ip, countryCode) {
    const priceUrl = 
        `/api/price?ip=${ipData.query}&products=annual,monthly&country=${ipData.countryCode}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    const monthlyDisplayPrice = document.querySelector('.monthly__price')
    monthlyDisplayPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
    monthlyDisplayPrice.classList.remove('monthly__price--unready');
    document.querySelector('.monthly input[name="price"]').value = priceData.products.monthly.price;
    document.querySelector('.monthly input[name="currency"]').value = priceData.currency;
    const  annualDisplayPrice = document.querySelector('.annual__price')
    annualDisplayPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`;
    annualDisplayPrice.classList.remove('annual__price--unready');
    document.querySelector('.annual input[name="price"]').value = priceData.products.annual.price;
    document.querySelector('.annual input[name="currency"]').value = priceData.currency;
  }
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  const ip = ipData.query;
  document.querySelector('.monthly input[name="ip"]').value = ip;
  document.querySelector('.annual input[name="ip"]').value = ip;
  await updatePrice(ip, ipData.countryCode);
})();
