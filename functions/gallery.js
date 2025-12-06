export async function onRequest(context) {
  const { env } = context;

  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
  const resp = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}`
    }
  });
  const body = await resp.json();
  if (!body || !body.result) {
    // older API variants return result.results
    const items = body.result?.results || body.result || body.results || [];
    const images = items.map(i => (i.variants && i.variants[0]) || i.url || '');
    return new Response(JSON.stringify({ images }), { headers: { 'Content-Type': 'application/json' }});
  }
  // new API shape
  const items = body.result;
  const images = items.map(i => (i.variants && i.variants[0]) || i.url || '');
  return new Response(JSON.stringify({ images }), { headers: { 'Content-Type': 'application/json' }});
}