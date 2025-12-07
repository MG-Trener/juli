// functions/upload.js — Cloudflare Worker для загрузки изображений

export async function onRequest(context) {
  const { request, env } = context;

  try {
    // Только POST
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only' }, 405);
    }

    // Проверка сессии
    const cookie = request.headers.get('Cookie') || '';
    const session = cookie.split('session=')[1]?.split(';')[0] || '';

    if (!session || session !== env.ADMIN_PASSWORD_HASH) {
      return json({ ok: false, error: 'Invalid session' }, 401);
    }

    // Читаем FormData
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ ok: false, error: "Expected multipart/form-data" }, 400);
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return json({ ok: false, error: "File missing" }, 400);
    }

    // Отправляем в Cloudflare Images
    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CF_IMAGES_TOKEN}`
        },
        body: form
      }
    );

    const uploadJson = await uploadRes.json();

    if (!uploadJson.success) {
      return json({ ok: false, error: uploadJson.errors }, 500);
    }

    const imageUrl = uploadJson.result.variants[0];

    // Обновляем gallery.json
    const galleryRes = await context.env.ASSETS.fetch('https://juli-7rt.pages.dev/gallery.json');
    const galleryData = await galleryRes.json().catch(() => ({ images: [] }));

    galleryData.images.push(imageUrl);

    await context.env.ASSETS.put("gallery.json", JSON.stringify(galleryData), {
      httpMetadata: { contentType: "application/json" }
    });

    return json({ ok: true, url: imageUrl });

  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

// helper
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
