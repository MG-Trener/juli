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

// Единый выход: после завершения сессии всегда возвращаем пользователя на главную страницу.
(function(){
  document.addEventListener('click',async function(e){
    const btn=e.target.closest&&e.target.closest('#out');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      if(window.supabase&&window.JULI_SUPABASE_URL&&window.JULI_SUPABASE_ANON_KEY){
        const client=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);
        await client.auth.signOut();
      }
    }catch(err){console.warn('Sign out:',err)}
    location.href='./';
  },true);
})();

// Быстрый переход преподавателя к редактору материалов.
(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;
  const addLink=()=>{
    const actions=document.querySelector('.top > div:last-child');
    if(actions&&!document.getElementById('materialsAdminLink')){
      const link=document.createElement('a');
      link.id='materialsAdminLink';
      link.className='btn';
      link.href='materials-admin.html';
      link.textContent='Материалы курсов';
      link.style.marginRight='6px';
      actions.insertBefore(link,actions.firstChild);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addLink);else addLink();
})();

// Удалённый из кабинета пользователь считается удалённым для интерфейса:
// не показывается в списке и не участвует в статистике.
(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    try{
      if(typeof updateSummary!=='function'||typeof render!=='function'||typeof allStudents==='undefined'||typeof accessRows==='undefined'){
        if(attempts>80)clearInterval(timer);
        return;
      }
      clearInterval(timer);

      const originalUpdateSummary=updateSummary;
      updateSummary=function(){
        allStudents=(allStudents||[]).filter(s=>!s.archived);
        const currentIds=new Set(allStudents.map(s=>s.id));
        const currentAccess=(accessRows||[]).filter(r=>currentIds.has(r.student_id));
        const activeIds=new Set(allStudents.filter(s=>s.is_active).map(s=>s.id));
        const activeAccess=currentAccess.filter(r=>activeIds.has(r.student_id));
        studentCount.textContent='Ученики: '+allStudents.length;
        activeCount.textContent='Активные: '+allStudents.filter(s=>s.is_active).length;
        accessCount.textContent='Открытых курсов: '+activeAccess.filter(r=>r.access_granted).length;
        paidCount.textContent='Оплачено: '+currentAccess.filter(r=>r.paid).length;
      };

      const originalRender=render;
      render=function(){
        allStudents=(allStudents||[]).filter(s=>!s.archived);
        originalRender();
        document.querySelectorAll('.danger').forEach(btn=>{
          if((btn.textContent||'').includes('Удалить из списка'))btn.textContent='Удалить';
        });
        const note=document.querySelector('.notice');
        if(note)note.textContent='Удалённые пользователи полностью скрываются из кабинета и не учитываются в статистике. Прогресс обучения подтверждает только преподаватель.';
      };

      if(typeof archiveUser==='function'){
        const originalArchive=archiveUser;
        archiveUser=async function(id){
          if(!confirm('Удалить пользователя? Он исчезнет из кабинета, потеряет доступ к курсам и больше не будет учитываться в статистике.'))return;
          const now=new Date().toISOString();
          const {error:pErr}=await db.from('profiles').update({archived:true,is_active:false,blocked_at:now}).eq('id',id);
          if(pErr){status.textContent='Ошибка удаления: '+pErr.message;return}
          const {error:aErr}=await db.from('course_access').update({access_granted:false,updated_at:now}).eq('student_id',id);
          if(aErr){status.textContent='Пользователь удалён, но не удалось закрыть доступы: '+aErr.message;return}
          allStudents=(allStudents||[]).filter(s=>s.id!==id);
          accessRows=(accessRows||[]).filter(r=>r.student_id!==id);
          accessMap=new Map(accessRows.map(x=>[x.student_id+'-'+x.course_level,x]));
          updateSummary();
          render();
          status.textContent='Пользователь удалён.';
        };
      }

      updateSummary();
      render();
    }catch(err){
      console.warn('Admin deleted-user cleanup:',err);
    }
  },100);
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
      if(typeof window.saveUser!=='function'){if(attempts>50)clearInterval(wait);return}
      clearInterval(wait);if(window.saveUser.__juliFeedbackWrapped)return;
      const original=window.saveUser;
      const wrapped=async function(studentId){
        const before=document.getElementById('student-'+studentId);before?.querySelector('.student-save-feedback')?.remove();
        const startBtn=document.getElementById('save-'+studentId);if(startBtn)startBtn.textContent='Сохраняем…';
        await original(studentId);
        const card=document.getElementById('student-'+studentId);if(!card)return;
        const actionsRight=card.querySelector('.actions-right'),btn=document.getElementById('save-'+studentId),statusEl=document.getElementById('status');
        const failed=(statusEl?.textContent||'').toLowerCase().includes('ошибка');
        const feedback=document.createElement('div');feedback.className='student-save-feedback '+(failed?'err':'ok');feedback.textContent=failed?'✕ Не удалось сохранить изменения':'✓ Изменения успешно сохранены';actionsRight?.prepend(feedback);requestAnimationFrame(()=>feedback.classList.add('show'));
        if(btn){if(failed)btn.textContent='Повторить сохранение';else{btn.textContent='Сохранено ✓';btn.classList.add('saved');setTimeout(()=>{if(document.body.contains(btn)){btn.textContent='Сохранить доступы';btn.classList.remove('saved')}},2800)}}
        if(!failed)setTimeout(()=>{if(document.body.contains(feedback))feedback.remove()},4500);
      };
      wrapped.__juliFeedbackWrapped=true;window.saveUser=wrapped;
    },100);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
