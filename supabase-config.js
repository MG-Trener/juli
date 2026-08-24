// Публичная конфигурация Supabase для JULI. Publishable key предназначен для браузерного клиента; доступ к данным ограничивает RLS.
window.JULI_SUPABASE_URL = "https://jsulovquulqixmhdygae.supabase.co";
window.JULI_SUPABASE_ANON_KEY = "sb_publishable_J1eFJrcv07gEB6Fc4T3mSQ_LmhSCLwg";

// Favicon для страниц, подключающих этот файл.
(function(){
  const icons=[
    {rel:'icon',type:'image/x-icon',href:'assets/favicon.ico'},
    {rel:'icon',type:'image/png',sizes:'32x32',href:'assets/favicon-32x32.png'},
    {rel:'icon',type:'image/png',sizes:'16x16',href:'assets/favicon-16x16.png'},
    {rel:'apple-touch-icon',sizes:'180x180',href:'assets/apple-touch-icon.png'}
  ];
  icons.forEach(icon=>{const link=document.createElement('link');Object.entries(icon).forEach(([k,v])=>link.setAttribute(k,v));document.head.appendChild(link)});
})();

// Быстрый переход преподавателя к редактору материалов.
(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;
  const addLink=()=>{const actions=document.querySelector('.top > div:last-child');if(!actions||document.getElementById('materialsAdminLink'))return;const link=document.createElement('a');link.id='materialsAdminLink';link.className='btn';link.href='materials-admin.html';link.textContent='Материалы курсов';link.style.marginRight='6px';actions.insertBefore(link,actions.firstChild)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addLink);else addLink();
})();

// Явная обратная связь после сохранения доступов ученика.
(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;

  const install=()=>{
    const style=document.createElement('style');
    style.textContent=`
      .student-save-feedback{display:flex;align-items:center;gap:8px;min-height:36px;padding:8px 12px;border-radius:12px;font-size:13px;font-weight:800;opacity:0;transform:translateY(3px);transition:.2s ease}
      .student-save-feedback.show{opacity:1;transform:none}
      .student-save-feedback.ok{color:#bfe4c6;border:1px solid rgba(154,211,168,.28);background:rgba(67,126,81,.14)}
      .student-save-feedback.err{color:#f0b7b7;border:1px solid rgba(217,141,141,.32);background:rgba(130,55,55,.14)}
      .save.saved{background:linear-gradient(135deg,#a8d6b3,#74aa82)!important;color:#0d1711!important;box-shadow:0 0 0 3px rgba(154,211,168,.08)}
    `;
    document.head.appendChild(style);

    let attempts=0;
    const wait=setInterval(()=>{
      attempts++;
      if(typeof window.saveUser!=='function'){
        if(attempts>50)clearInterval(wait);
        return;
      }
      clearInterval(wait);
      if(window.saveUser.__juliFeedbackWrapped)return;

      const original=window.saveUser;
      const wrapped=async function(studentId){
        const before=document.getElementById('student-'+studentId);
        const oldFeedback=before?.querySelector('.student-save-feedback');
        if(oldFeedback)oldFeedback.remove();
        const startBtn=document.getElementById('save-'+studentId);
        if(startBtn)startBtn.textContent='Сохраняем…';

        await original(studentId);

        const card=document.getElementById('student-'+studentId);
        if(!card)return;
        const actionsRight=card.querySelector('.actions-right');
        const btn=document.getElementById('save-'+studentId);
        const statusEl=document.getElementById('status');
        const failed=(statusEl?.textContent||'').toLowerCase().includes('ошибка');

        const feedback=document.createElement('div');
        feedback.className='student-save-feedback '+(failed?'err':'ok');
        feedback.textContent=failed?'✕ Не удалось сохранить изменения':'✓ Изменения успешно сохранены';
        actionsRight?.prepend(feedback);
        requestAnimationFrame(()=>feedback.classList.add('show'));

        if(btn){
          if(failed){btn.textContent='Повторить сохранение'}
          else{
            btn.textContent='Сохранено ✓';
            btn.classList.add('saved');
            setTimeout(()=>{if(document.body.contains(btn)){btn.textContent='Сохранить';btn.classList.remove('saved')}},2800);
          }
        }
        if(!failed)setTimeout(()=>{if(document.body.contains(feedback))feedback.remove()},4500);
      };
      wrapped.__juliFeedbackWrapped=true;
      window.saveUser=wrapped;
    },100);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
