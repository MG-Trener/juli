const courseCatalog=window.JULI_COURSE_STRUCTURE||{};
const level=Number(document.body.dataset.courseLevel);
const course=courseCatalog[level];
const configured=window.JULI_SUPABASE_URL&&!window.JULI_SUPABASE_URL.startsWith('YOUR_')&&window.JULI_SUPABASE_ANON_KEY&&!window.JULI_SUPABASE_ANON_KEY.startsWith('YOUR_');
const db=configured?window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY):null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let currentProfile=null,completed=new Set();

function blockKind(text){const t=text.trim().toLowerCase();if(t.startsWith('практика')||t.startsWith('задание'))return['Практика','practice'];if(t.startsWith('важно')||t.startsWith('обратите внимание'))return['Важно','important'];if(t.startsWith('цель'))return['Что вы изучите',''];if(t.startsWith('алгоритм')||t.startsWith('последовательность'))return['Алгоритм работы',''];if(t.startsWith('основн')||t.startsWith('ключев'))return['Ключевые моменты',''];return['Теория','']}
function lessonHtml(content){const parts=String(content||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);return parts.map(p=>{const [label,cls]=blockKind(p);return `<div class="lesson-block ${cls}"><strong>${label}</strong><p>${esc(p)}</p></div>`}).join('')}
function contiguousCompleted(){let n=0;while(n<course.modules.length&&completed.has(n+1))n++;return n}
function ensureProgress(){if(document.getElementById('courseProgress'))return;const el=document.createElement('section');el.id='courseProgress';el.className='course-progress';notice.insertAdjacentElement('afterend',el)}
function renderProgress(){if(currentProfile?.role==='owner')return;ensureProgress();const done=contiguousCompleted(),total=course.modules.length,percent=Math.round(done/total*100),current=Math.min(done+1,total);courseProgress.innerHTML=`<div class="course-progress-top"><div><span class="course-progress-kicker">Ваш прогресс</span><strong>${done===total?'Ступень завершена':`Сейчас открыт модуль ${current} из ${total}`}</strong></div><div class="course-progress-value">${percent}%</div></div><div class="course-progress-track"><div class="course-progress-fill" style="width:${percent}%"></div></div><div class="course-progress-steps">${Array.from({length:total},(_,i)=>{const n=i+1,doneStep=n<=done,currentStep=n===current&&done<total;return `<span class="${doneStep?'done':currentStep?'current':''}">${doneStep?'✓':n}</span>`}).join('')}</div><div class="course-progress-note">${done===total?'Все модули подтверждены преподавателем.':`После подтверждения преподавателем модуля ${current} автоматически откроется следующий.`}</div>`}
}

async function init(){
  if(!course){lock('Структура курса не загружена','Обновите страницу.');return}
  document.title=`${course.title} — JULI`;courseTitle.textContent=course.title;courseSubtitle.textContent=course.subtitle;courseLevel.textContent=`Ступень ${level}`;
  if(!db){lock('Система авторизации не настроена','Сначала необходимо подключить Supabase.');return}
  const {data:{user}}=await db.auth.getUser();if(!user){location.href='login.html';return}
  const {data:profile,error:pErr}=await db.from('profiles').select('*').eq('id',user.id).single();if(pErr||!profile){lock('Профиль не найден','Войдите в аккаунт повторно или обратитесь к преподавателю.');return}
  currentProfile=profile;
  if(profile.role!=='owner'&&((Object.hasOwn(profile,'is_active')&&!profile.is_active)||(Object.hasOwn(profile,'archived')&&profile.archived))){await db.auth.signOut();location.href='login.html?blocked=1';return}
  let allowed=profile.role==='owner';
  if(!allowed){const {data:access,error:aErr}=await db.from('course_access').select('access_granted').eq('student_id',user.id).eq('course_level',level).maybeSingle();if(aErr){lock('Не удалось проверить доступ','Обновите страницу или обратитесь к преподавателю.');return}allowed=!!access?.access_granted}
  if(!allowed){lock('Доступ к этой ступени закрыт','Преподаватель ещё не разрешил вам доступ к этому курсу.');return}
  const queries=[db.from('course_materials').select('module_no,title,content,sort_order').eq('course_level',level).eq('published',true).order('sort_order').order('module_no')];
  if(profile.role!=='owner')queries.push(db.from('student_progress').select('module_no,completed').eq('student_id',user.id).eq('course_level',level));
  const results=await Promise.all(queries),materials=results[0].data,mErr=results[0].error;
  if(mErr){lock('Материалы временно недоступны','Не удалось загрузить содержание курса. Попробуйте позже.');return}
  if(results[1]?.error)console.warn('Progress error:',results[1].error.message);
  completed=new Set((results[1]?.data||[]).filter(x=>x.completed).map(x=>x.module_no));
  app.classList.remove('hidden');renderProgress();renderModules(materials||[]);
  notice.textContent=profile.role==='owner'?'Режим преподавателя: просмотр опубликованной версии курса.':'Материалы открываются последовательно. Переход к следующему модулю подтверждает преподаватель.';
  setTimeout(scrollToHash,50)
}

function renderModules(materials){
  const byModule=new Map();materials.forEach(x=>{if(!byModule.has(x.module_no))byModule.set(x.module_no,[]);byModule.get(x.module_no).push(x)});
  const owner=currentProfile?.role==='owner';
  const doneCount=contiguousCompleted();
  const unlockedThrough=owner?course.modules.length:Math.min(doneCount+1,course.modules.length);
  modules.innerHTML=course.modules.map((def,i)=>{
    const n=i+1,rows=byModule.get(n)||[],title=rows[0]?.title||def.title,content=rows.map(r=>r.content).filter(Boolean).join('\n\n'),done=!owner&&n<=doneCount,unlocked=owner||n<=unlockedThrough;
    if(!unlocked){return `<article class="module module-locked" id="module-${n}"><div class="module-lock-icon">🔒</div><div><div class="eyebrow">Модуль ${n}</div><h2>${esc(title)}</h2><div class="module-locked-text">Содержание откроется после подтверждения преподавателем предыдущего модуля.</div></div></article>`}
    return `<article class="module ${done?'completed':''} ${!owner&&n===unlockedThrough&&doneCount<course.modules.length?'current':''}" id="module-${n}"><div class="eyebrow">Модуль ${n}${done?' · ПРОЙДЕН':' '}</div><h2>${esc(title)}</h2>${content?`<div class="lesson">${lessonHtml(content)}</div>`:`<div class="module-empty">Материал модуля пока не опубликован преподавателем.</div>`}<div class="module-footer"><span class="module-state">${owner?'Преподаватель просматривает опубликованный материал':done?'✓ Завершение подтверждено преподавателем':'Текущий модуль · ожидает подтверждения преподавателя'}</span></div></article>`
  }).join('')
}

function scrollToHash(){if(!location.hash)return;const target=document.querySelector(location.hash);if(target&&!target.classList.contains('module-locked'))target.scrollIntoView({behavior:'smooth',block:'start'})}
function lock(title,text){lockedTitle.textContent=title;lockedText.textContent=text;locked.classList.remove('hidden')}
out.onclick=async()=>{if(db)await db.auth.signOut();location.href='./'};
init();
