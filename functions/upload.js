
export async function onRequestPost(context) {
  const { request, env } = context;

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return new Response(JSON.stringify({ error: "No file" }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    });
  }

  const upload = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_IMAGES_TOKEN}`
    },
    body: formData
  });

  const result = await upload.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
