export async function onRequest(context) {
  const { request, env } = context;

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' }});
  }

  // Verify session cookie: must equal ADMIN_PASSWORD_HASH
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='));
  if (!match) {
    return new Response(JSON.stringify({ ok: false, error: 'Not authenticated (no session)' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
  }
  const sessionValue = match.split('=')[1];
  if (sessionValue !== env.ADMIN_PASSWORD_HASH) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid session' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
  }

  // Parse incoming form data
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) {
    return new Response(JSON.stringify({ ok: false, error: 'No file provided' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
  }

  // Forward file to Cloudflare Images upload endpoint
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

  // Create a new FormData to forward (retain file)
  const forwardForm = new FormData();
  forwardForm.append('file', file, file.name);

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_IMAGES_TOKEN}`
    },
    body: forwardForm
  });

  const json = await resp.json();
  // Return the raw response from Cloudflare Images to the client
  return new Response(JSON.stringify(json), { status: resp.status, headers: { 'Content-Type': 'application/json' }});
}