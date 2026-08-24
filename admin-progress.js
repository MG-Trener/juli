(function(){
  if(!/\/admin\.html$/.test(location.pathname))return;
  const courses=['','Парикмахер с нуля','Женские стрижки','Колористика','Блонд без ошибок','Современные окрашивания','Продвинутый мастер','Колорист-эксперт'];
  const configured=window.JULI_SUPABASE_URL&&window.JULI_SUPABASE_ANON_KEY&&window.supabase;
  if(!configured)return;
  const db=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);
  let currentStudent=null;

  const style=document.createElement('style');
  style.textContent=`
    .progress-admin-btn{border-color:rgba(154,211,168,.30)!important;color:#bfe4c6!important}
    .progress-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(4,7,11,.78);backdrop-filter:blur(10px);display:grid;place-items:center;padding:18px}
    .progress-modal-backdrop[hidden]{display:none!important}
    .progress-modal{width:min(900px,100%);max-height:min(820px,92vh);overflow:auto;border:1px solid rgba(221,178,121,.28);border-radius:26px;background:linear-gradient(155deg,#18212c,#0f151e);box-shadow:0 30px 90px rgba(0,0,0,.55);color:#f7f3ec}
    .progress-modal-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px;background:rgba(18,25,35,.96);border-bottom:1px solid rgba(255,255,255,.06);backdrop-filter:blur(14px)}
    .progress-modal-head h2{font:500 30px Georgia,serif;margin:4px 0}.progress-modal-head p{margin:0;color:#aeb5c1;font-size:13px}.progress-close{width:40px;height:40px;padding:0;border-radius:50%;font-size:20px}
    .progress-body{padding:18px 24px 24px;display:grid;gap:12px}.progress-course{border:1px solid rgba(221,178,121,.18);border-radius:18px;padding:17px;background:rgba(255,255,255,.02)}
    .progress-course.locked{opacity:.52}.progress-course-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.progress-course-head strong{font:500 21px Georgia,serif}.progress-course-head span{font-size:11px;color:#d2a56c;letter-spacing:.08em;text-transform:uppercase}
    .progress-modules{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.progress-module{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 8px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#101721;font-size:12px;cursor:pointer;transition:.18s ease}.progress-module input{width:17px;height:17px;accent-color:#c6975a}.progress-module.disabled-step{opacity:.38;cursor:not-allowed}.progress-module.current-step{border-color:rgba(210,165,108,.35);background:rgba(210,165,108,.08)}
    .progress-seq-note{margin-top:10px;color:#8e97a3;font-size:11px}.progress-footer{position:sticky;bottom:0;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:16px 24px;border-top:1px solid rgba(255,255,255,.06);background:rgba(15,21,30,.97)}.progress-status{font-size:13px;color:#aeb5c1}.progress-status.ok{color:#9ad3a8}.progress-status.err{color:#efb1b1}.progress-save{border:0!important;background:linear-gradient(135deg,#e2ba82,#b98343)!important;color:#101722!important;min-width:180px}
    @media(max-width:700px){.progress-modules{grid-template-columns:repeat(3,1fr)}.progress-footer{align-items:stretch;flex-direction:column}.progress-save{width:100%}}
  `;
  document.head.appendChild(style);

  const backdrop=document.createElement('div');
  backdrop.className='progress-modal-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML=`<section class="progress-modal" role="dialog" aria-modal="true"><div class="progress-modal-head"><div><div style="color:#d2a56c;font-size:10px;font-weight:900;letter-spacing:.13em">ПРОГРЕСС ОБУЧЕНИЯ</div><h2 id="progressStudentName">Ученик</h2><p>Каждый следующий модуль открывается только после подтверждения предыдущего.</p></div><button class="progress-close" type="button" aria-label="Закрыть">×</button></div><div id="progressBody" class="progress-body"></div><div class="progress-footer"><div id="progressStatus" class="progress-status"></div><button id="progressSave" class="progress-save" type="button">Сохранить прогресс</button></div></section>`;
  document.body.appendChild(backdrop);
  const body=backdrop.querySelector('#progressBody'),status=backdrop.querySelector('#progressStatus'),save=backdrop.querySelector('#progressSave');
  const close=()=>{backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');currentStudent=null};
  backdrop.querySelector('.progress-close').onclick=close;backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});

  function syncCourse(level){
    const courseEl=body.querySelector(`.progress-course[data-level="${level}"]`);if(!courseEl||courseEl.classList.contains('locked'))return;
    const inputs=[...courseEl.querySelectorAll('input[data-module]')].sort((a,b)=>Number(a.dataset.module)-Number(b.dataset.module));
    let previousComplete=true;
    inputs.forEach((input,i)=>{
      const label=input.closest('.progress-module');
      if(i===0){input.disabled=false;label.classList.remove('disabled-step')}
      else if(previousComplete){input.disabled=false;label.classList.remove('disabled-step')}
      else{input.checked=false;input.disabled=true;label.classList.add('disabled-step')}
      previousComplete=previousComplete&&input.checked;
      label.classList.toggle('current-step',!input.checked&&!input.disabled&&inputs.slice(0,i).every(x=>x.checked));
    });
  }
  function syncAll(){for(let level=1;level<=7;level++)syncCourse(level)}

  async function openProgress(studentId){
    currentStudent=studentId;status.className='progress-status';status.textContent='Загрузка...';backdrop.hidden=false;backdrop.setAttribute('aria-hidden','false');
    const [{data:student,error:sErr},{data:access,error:aErr},{data:progress,error:pErr}]=await Promise.all([
      db.from('profiles').select('full_name,email').eq('id',studentId).single(),
      db.from('course_access').select('course_level,access_granted').eq('student_id',studentId),
      db.from('student_progress').select('course_level,module_no,completed').eq('student_id',studentId)
    ]);
    if(sErr||aErr||pErr){status.className='progress-status err';status.textContent='Не удалось загрузить прогресс.';return}
    backdrop.querySelector('#progressStudentName').textContent=student?.full_name||student?.email||'Ученик';
    const accessSet=new Set((access||[]).filter(x=>x.access_granted).map(x=>x.course_level));
    const done=new Set((progress||[]).filter(x=>x.completed).map(x=>`${x.course_level}-${x.module_no}`));
    body.innerHTML=[1,2,3,4,5,6,7].map(level=>{const allowed=accessSet.has(level);return `<div class="progress-course ${allowed?'':'locked'}" data-level="${level}"><div class="progress-course-head"><strong>${level}. ${courses[level]}</strong><span>${allowed?'Доступ открыт':'Нет доступа к курсу'}</span></div><div class="progress-modules">${[1,2,3,4,5,6].map(n=>`<label class="progress-module"><input type="checkbox" data-level="${level}" data-module="${n}" ${done.has(`${level}-${n}`)?'checked':''} ${allowed?'':'disabled'}> Модуль ${n}</label>`).join('')}</div>${allowed?'<div class="progress-seq-note">Подтвердите текущий модуль — следующий станет доступен ученику автоматически.</div>':''}</div>`}).join('');
    syncAll();status.textContent='Подтверждение идёт строго по порядку: 1 → 2 → 3 → 4 → 5 → 6.';
  }

  body.addEventListener('change',e=>{
    const input=e.target.closest('input[data-level][data-module]');if(!input)return;
    const level=Number(input.dataset.level),moduleNo=Number(input.dataset.module);
    if(!input.checked){body.querySelectorAll(`input[data-level="${level}"]`).forEach(x=>{if(Number(x.dataset.module)>moduleNo)x.checked=false})}
    syncCourse(level);
  });

  save.onclick=async()=>{
    if(!currentStudent)return;save.disabled=true;status.className='progress-status';status.textContent='Сохраняем...';syncAll();
    const rows=[];const now=new Date().toISOString();
    for(let level=1;level<=7;level++){
      const courseEl=body.querySelector(`.progress-course[data-level="${level}"]`);if(!courseEl||courseEl.classList.contains('locked'))continue;
      for(let n=1;n<=6;n++){
        const input=courseEl.querySelector(`input[data-module="${n}"]`);rows.push({student_id:currentStudent,course_level:level,module_no:n,completed:!!input?.checked,completed_at:input?.checked?now:null});
      }
    }
    const {error}=await db.from('student_progress').upsert(rows,{onConflict:'student_id,course_level,module_no'});save.disabled=false;
    if(error){console.error(error);status.className='progress-status err';status.textContent='✕ Не удалось сохранить. Проверьте актуальную Supabase-схему.';return}
    status.className='progress-status ok';status.textContent='✓ Прогресс сохранён. Следующий модуль откроется ученику автоматически.';save.textContent='Сохранено ✓';setTimeout(()=>save.textContent='Сохранить прогресс',1800);
  };

  function inject(){document.querySelectorAll('.student[id^="student-"]').forEach(card=>{const id=card.id.slice(8),target=card.querySelector('.actions-right');if(!target||target.querySelector('.progress-admin-btn'))return;const btn=document.createElement('button');btn.type='button';btn.className='progress-admin-btn';btn.textContent='Прогресс';btn.onclick=()=>openProgress(id);target.insertBefore(btn,target.firstChild)})}
  const observer=new MutationObserver(inject);observer.observe(document.body,{childList:true,subtree:true});inject();
})();
