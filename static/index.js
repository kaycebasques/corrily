(async () => {
  async function updatePrice() {
    const ip = document.querySelector('.monthly input[name="ip"]').value;
    const priceUrl = `/api/price?ip=${ip}&products=annual,monthly`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    const monthlyDisplayPrice = document.querySelector('.monthly__price')
    monthlyDisplayPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.monthly.price} ${priceData.currency}`;
    monthlyDisplayPrice.classList.remove('monthly__price--unready');
    const  annualDisplayPrice = document.querySelector('.annual__price')
    annualDisplayPrice.textContent =
        `${priceData.currency_symbol}${priceData.products.annual.price} ${priceData.currency}`;
    annualDisplayPrice.classList.remove('annual__price--unready');
  }
  // await updatePrice();
})();
