// Hero fallback: если WebP недоступен, используем PNG.
(function(){
  const probe=new Image();
  probe.onerror=()=>{
    const s=document.createElement('style');
    s.textContent=`.hero:before{background:linear-gradient(90deg,#0a0f16 0%,rgba(10,15,22,.98) 28%,rgba(10,15,22,.79) 48%,rgba(10,15,22,.16) 72%,rgba(10,15,22,.08) 100%),url('assets/hero-model.png') 82% 36%/auto 112% no-repeat}`;
    document.head.appendChild(s);
  };
  probe.src='assets/hero-model.webp';
})();

// На телефоне подробности карточек раскрываются по кнопке.
document.querySelectorAll('.course-toggle').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const card=btn.closest('.course');
    const expanded=card.classList.toggle('expanded');
    btn.setAttribute('aria-expanded',String(expanded));
    btn.firstChild.textContent=expanded?'Скрыть подробности ':'Подробнее ';
  });
});

// Если пользователь уже вошёл, ведём его сразу в кабинет его роли.
(async function(){
  const authLink=document.getElementById('authLink');
  const portalBtn=document.getElementById('portalBtn');
  const portalText=document.getElementById('portalText');
  if(!window.supabase||!window.JULI_SUPABASE_URL||!window.JULI_SUPABASE_ANON_KEY)return;
  try{
    const db=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);
    const {data:{session}}=await db.auth.getSession();
    if(!session?.user)return;
    const {data:p,error}=await db.from('profiles').select('full_name,role,is_active,archived').eq('id',session.user.id).single();
    if(error||!p||!p.is_active||p.archived)return;
    const cabinet=p.role==='superteacher'?'admin.html':p.role==='teacher'?'teacher.html':p.role==='student'?'student.html':'candidate.html';
    const displayName=(p.full_name||session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Личный кабинет').trim();
    if(authLink){authLink.textContent=displayName;authLink.href=cabinet;}
    if(portalBtn){portalBtn.textContent='Открыть личный кабинет';portalBtn.href=cabinet;}
    if(portalText){
      if(p.role==='superteacher')portalText.textContent=`Вы вошли как ${displayName}. Откройте панель Суперучителя для управления академией.`;
      else if(p.role==='teacher')portalText.textContent=`Вы вошли как ${displayName}. Откройте кабинет Учителя для работы с назначенными учениками.`;
      else if(p.role==='student')portalText.textContent=`Вы вошли как ${displayName}. Перейдите в кабинет, чтобы продолжить обучение.`;
      else portalText.textContent=`Вы вошли как ${displayName}. Ваша регистрация ожидает распределения Суперучителем.`;
    }
  }catch(err){console.error('JULI auth state:',err)}
})();
