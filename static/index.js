(async () => {
  const ipResponse = await fetch('https://extreme-ip-lookup.com/json/');
  const ipData = await ipResponse.json();
  document.querySelector('#price').textContent = ipData.countryCode;
  console.log(ipData);
  const url = `/api/price?ip=${ipData.query}&products=annual,monthly`;
  const priceResponse = await fetch('/api/price', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      a: 1, b: 'Textual content'})
  });
  const content = await rawResponse.json();
})();
