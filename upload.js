// upload.js — фронтенд загрузки фото в админке

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('status');
    const galleryBlock = document.getElementById('gallery');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = "Загрузка...";

        const file = fileInput.files[0];
        if (!file) {
            status.textContent = "Файл не выбран.";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'   // ← ОБЯЗАТЕЛЬНО! иначе нет session cookie
            });

            const result = await response.json();

            if (!result.ok) {
                status.textContent = "Ошибка: " + result.error;
                console.error(result);
                return;
            }

            status.textContent = "Загружено!";
            fileInput.value = '';

            // обновляем галерею
            loadGallery();

        } catch (err) {
            status.textContent = "Ошибка сети";
            console.error(err);
        }
    });

    // ---- Загрузка галереи ----
    async function loadGallery() {
        try {
            const res = await fetch('/gallery.json', { cache: "no-store" });
            const data = await res.json();

            galleryBlock.innerHTML = '';

            if (!data.images || data.images.length === 0) {
                galleryBlock.innerHTML = '<p>Галерея пуста</p>';
                return;
            }

            for (const url of data.images) {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'gallery-photo';
                galleryBlock.appendChild(img);
            }

        } catch (e) {
            galleryBlock.innerHTML = '<p>Ошибка загрузки галереи</p>';
        }
    }

    loadGallery();
});
