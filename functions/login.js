
export async function onRequestPost(context) {
  const { request, env } = context;
  const data = await request.json();
  const login = data.login;
  const password = data.password;

  if (login !== env.ADMIN_LOGIN) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid login" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const encoder = new TextEncoder();
  const passBytes = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", passBytes);
  const base64Hash = btoa(String.fromCharCode(...new Uint8Array(hash)));

  if (base64Hash !== env.ADMIN_PASSWORD_HASH) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const session = crypto.randomUUID();

  return new Response(JSON.stringify({ ok: true, session }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
