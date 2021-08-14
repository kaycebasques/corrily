(async () => {
  async function updatePrice(ip, countryCode) {
    const priceUrl = 
        `/api/price?ip=${ipData.query}&products=annual,monthly&country=${ipData.countryCode}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    const monthlyPrice = document.querySelector('.monthly__price')
    monthlyPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
    monthlyPrice.classList.remove('monthly__price--unready');
    const  annualPrice = document.querySelector('.annual__price')
    annualPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`;
    annualPrice.classList.remove('annual__price--unready');
  }
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  const ip = ipData.query;
  await updatePrice(ip, ipData.countryCode);
  const monthly = document.querySelector('.monthly__subscribe');
  monthly.addEventListener('click', () => {
    
  });
  const annual = document.querySelector('.annual__subscribe');
  annual.addEventListener('click', () => {
    
  });
})();
