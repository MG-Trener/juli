export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'POST only' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const login = data.login || '';
    const password = data.password || '';

    if (login !== env.ADMIN_LOGIN) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // compute SHA-256 and base64 encode
    const encoder = new TextEncoder();
    const passBytes = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = btoa(String.fromCharCode(...hashArray));

    if (hashString !== env.ADMIN_PASSWORD_HASH) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set session cookie
    const cookieValue = hashString;
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toUTCString();
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${cookieValue}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Lax`
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
