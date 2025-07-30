
import fetch from 'node-fetch';

export default async (req, res) => {
  const apiToken = process.env.KINTONE_API_TOKEN;
  const domain = process.env.KINTONE_DOMAIN;
  const appId = process.env.KINTONE_APP_ID; // Just one app ID

  const url = `https://${domain}/k/v1/records.json?app=${appId}&query=order%20by%20$ID%20asc`;

  const response = await fetch(url, {
    headers: {
      'X-Cybozu-API-Token': apiToken,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch from Kintone' });
  }

  const data = await response.json();
  return res.status(200).json(data);
};