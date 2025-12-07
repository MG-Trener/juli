export async function onRequest(context) {
  const { request, env } = context;

  // Only POST
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'POST only' }, 405);
  }

  // Check session cookie
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('session='));
  if (!match) {
    return json({ ok: false, error: 'Not authenticated' }, 401);
  }

  const sessionValue = match.split('=')[1];
  if (sessionValue !== env.ADMIN_PASSWORD_HASH) {
    return json({ ok: false, error: 'Invalid session' }, 401);
  }

  // Parse form data
  const form = await request.formData();
  const file = form.get('file');

  if (!file) {
    return json({ ok: false, error: 'No file provided' }, 400);
  }

  // Read file
  const bytes = await file.arrayBuffer();
  const blob = new Blob([bytes], { type: file.type });

  // Upload to Cloudflare Images
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

  const cfForm = new FormData();
  cfForm.append('file', blob, file.name);

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_IMAGES_TOKEN}`
    },
    body: cfForm
  });

  const jsonResp = await resp.json();

  // Return result
  return json({ ok: true, result: jsonResp });
}

// Helper for consistent responses
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
