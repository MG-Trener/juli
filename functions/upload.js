export async function onRequest(context) {
  const { request, env } = context;

  // Only POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check session cookie
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('session='));
  if (!match) {
    return new Response(JSON.stringify({ ok: false, error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessionValue = match.split('=')[1];
  if (sessionValue !== env.ADMIN_PASSWORD_HASH) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse form data
  const form = await request.formData();
  const file = form.get('file');

  if (!file) {
    return new Response(JSON.stringify({ ok: false, error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Convert File to ArrayBuffer
  const bytes = await file.arrayBuffer();
  const blob = new Blob([bytes], { type: file.type });

  // Prepare form to Cloudflare Images
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

  const cfForm = new FormData();
  cfForm.append('file', blob, file.name);

  // Upload
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}`
    },
    body: cfForm
  });

  const json = await resp.json();

  return new Response(JSON.stringify(json), {
    status: resp.status,
    headers: { 'Content-Type
