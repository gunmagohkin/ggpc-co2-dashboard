// netlify/functions/kintone.js

// Import fetch for Node (needed for Netlify Node 14/16)
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async function (event, context) {
  const apiToken = process.env.KINTONE_API_TOKEN;
  const domain = process.env.KINTONE_DOMAIN;
  const appId = process.env.KINTONE_APP_ID;

  // Validate environment variables
  if (!apiToken || !domain || !appId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing required environment variables',
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  const url = `https://${domain}/k/v1/records.json?app=${appId}`;

  // Debugging
  console.log('DEBUG URL:', url);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to connect to Kintone',
        details: err.message,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    return {
      statusCode: response.status,
      body: JSON.stringify({
        error: 'Failed to fetch from Kintone',
        details: errorText,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  };
};
