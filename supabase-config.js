// Публичная конфигурация Supabase для JULI.
window.JULI_SUPABASE_URL = "https://jsulovquulqixmhdygae.supabase.co";
window.JULI_SUPABASE_ANON_KEY = "sb_publishable_J1eFJrcv07gEB6Fc4T3mSQ_LmhSCLwg";

// Favicon для всех страниц сайта, которые подключают этот файл.
(function () {
  const icons = [
    { rel: 'icon', type: 'image/x-icon', href: 'assets/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'assets/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: 'assets/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: 'assets/apple-touch-icon.png' }
  ];
  icons.forEach(icon => {
    const link = document.createElement('link');
    Object.entries(icon).forEach(([key, value]) => link.setAttribute(key, value));
    link.setAttribute('data-juli-favicon', '1');
    document.head.appendChild(link);
  });
})();

// Визуальные эффекты главной страницы.
(function () {
  if (!document.querySelector('.course-line')) return;

  // Премиальный display-шрифт с кириллицей для главного заголовка.
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect);

  const preconnectStatic = document.createElement('link');
  preconnectStatic.rel = 'preconnect';
  preconnectStatic.href = 'https://fonts.gstatic.com';
  preconnectStatic.crossOrigin = 'anonymous';
  document.head.appendChild(preconnectStatic);

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap';
  document.head.appendChild(fontLink);

  const style = document.createElement('style');
  style.textContent = `
    .hero h1 {
      max-width: 760px;
      font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif !important;
      font-size: clamp(66px, 6.7vw, 100px) !important;
      font-weight: 500 !important;
      line-height: .88 !important;
      letter-spacing: -.035em;
      text-wrap: balance;
    }
    .hero h1 em {
      display: block;
      width: max-content;
      max-width: 100%;
      white-space: nowrap;
      margin-top: .08em;
      font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif;
      font-style: italic !important;
      font-weight: 500;
      letter-spacing: -.025em;
      color: #f0d5ad;
      text-shadow: 0 7px 28px rgba(210,165,108,.10);
    }
    .hero h1 em::after {
      content: "";
      display: inline-block;
      width: .72em;
      height: 1px;
      margin-left: .18em;
      vertical-align: .22em;
      background: linear-gradient(90deg, rgba(240,213,173,.72), transparent);
    }

    .course-line .course {
      position: relative;
      isolation: isolate;
      transition: background .28s ease, box-shadow .28s ease, transform .28s ease;
    }
    .course-line .course::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      background:
        radial-gradient(circle at 50% 0%, rgba(240,213,173,.16), transparent 46%),
        linear-gradient(180deg, rgba(210,165,108,.10), rgba(210,165,108,.015));
      box-shadow: inset 0 0 0 1px rgba(240,213,173,.34);
      transition: opacity .28s ease;
      z-index: -1;
    }
    .course-line .course-icon,
    .course-line .course h3,
    .course-line .price,
    .course-line .mini-btn {
      transition: transform .28s ease, color .28s ease, background .28s ease, border-color .28s ease, box-shadow .28s ease;
    }

    @media (hover:hover) and (pointer:fine) {
      .course-line .course:hover {
        transform: translateY(-3px);
        background: linear-gradient(180deg, rgba(210,165,108,.11), rgba(255,255,255,.018));
        box-shadow: 0 16px 34px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04);
        z-index: 3;
      }
      .course-line .course:hover::after { opacity: 1; }
      .course-line .course:hover .course-icon {
        transform: translateY(-2px) scale(1.08);
        color: #f4d8ae;
      }
      .course-line .course:hover h3 {
        color: #fffaf2;
        transform: translateY(-1px);
      }
      .course-line .course:hover .price { color: #ffe0ae; }
      .course-line .course:hover .mini-btn {
        color: #111821;
        border-color: rgba(240,213,173,.72);
        background: linear-gradient(135deg,#e4bd86,#b98243);
        box-shadow: 0 8px 22px rgba(185,130,67,.18);
        transform: translateY(-1px);
      }
    }

    @media (max-width: 900px) {
      .hero h1 {
        max-width: 100%;
        font-size: clamp(56px, 9.8vw, 82px) !important;
        line-height: .9 !important;
      }
    }
    @media (max-width: 650px) {
      .hero h1 {
        font-size: clamp(46px, 13.1vw, 62px) !important;
        line-height: .91 !important;
        letter-spacing: -.03em;
      }
      .hero h1 em::after { display: none; }
    }
    @media (max-width: 390px) {
      .hero h1 {
        font-size: clamp(43px, 12.6vw, 52px) !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
