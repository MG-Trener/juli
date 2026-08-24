(function(){
  'use strict';
  if(!/\/admin\.html$/.test(location.pathname)) return;
  if(!window.supabase || !window.JULI_SUPABASE_URL || !window.JULI_SUPABASE_ANON_KEY) return;

  var db=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);
  var courseNames=['','Парикмахер с нуля','Женские стрижки','Колористика','Блонд без ошибок','Современные окрашивания','Продвинутый мастер','Колорист-эксперт'];
  var currentStudent=null;

  var style=document.createElement('style');
  style.textContent='.teacher-progress-btn{border-color:rgba(154,211,168,.35)!important;color:#c5e8cb!important}.tp-backdrop{position:fixed;inset:0;z-index:2000;background:rgba(3,6,10,.82);backdrop-filter:blur(10px);display:none;place-items:center;padding:18px}.tp-backdrop.open{display:grid}.tp-modal{width:min(920px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(221,178,121,.28);border-radius:26px;background:linear-gradient(155deg,#18212c,#0f151e);box-shadow:0 30px 90px rgba(0,0,0,.58)}.tp-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px;background:rgba(18,25,35,.97);border-bottom:1px solid rgba(255,255,255,.06)}.tp-head h2{font:500 30px Georgia,serif;margin:4px 0}.tp-head p{margin:0;color:#aeb5c1;font-size:13px}.tp-close{width:40px;height:40px;padding:0;border-radius:50%}.tp-body{padding:18px 24px 24px;display:grid;gap:12px}.tp-course{border:1px solid rgba(221,178,121,.18);border-radius:18px;padding:17px;background:rgba(255,255,255,.02)}.tp-course.locked{opacity:.5}.tp-course-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.tp-course-head strong{font:500 21px Georgia,serif}.tp-course-head span{font-size:11px;color:#d2a56c;letter-spacing:.08em;text-transform:uppercase}.tp-modules{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.tp-module{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 8px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#101721;font-size:12px}.tp-module input{width:17px;height:17px;accent-color:#c6975a}.tp-module.disabled{opacity:.38}.tp-module.current{border-color:rgba(210,165,108,.38);background:rgba(210,165,108,.08)}.tp-note{margin-top:10px;color:#8e97a3;font-size:11px}.tp-foot{position:sticky;bottom:0;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:16px 24px;border-top:1px solid rgba(255,255,255,.06);background:rgba(15,21,30,.98)}.tp-status{font-size:13px;color:#aeb5c1}.tp-status.ok{color:#9ad3a8}.tp-status.err{color:#efb1b1}.tp-save{border:0!important;background:linear-gradient(135deg,#e2ba82,#b98343)!important;color:#101722!important;min-width:190px}@media(max-width:700px){.tp-modules{grid-template-columns:repeat(3,1fr)}.tp-foot{flex-direction:column;align-items:stretch}.tp-save{width:100%}}';
  document.head.appendChild(style);

  var backdrop=document.createElement('div');
  backdrop.className='tp-backdrop';
  backdrop.innerHTML='<section class="tp-modal"><div class="tp-head"><div><div style="color:#d2a56c;font-size:10px;font-weight:900;letter-spacing:.13em">ПРОГРЕСС УЧЕНИКА</div><h2 id="tpName">Ученик</h2><p>Подтверждение модулей выполняет только преподаватель. Следующий модуль открывается после предыдущего.</p></div><button type="button" class="tp-close">×</button></div><div id="tpBody" class="tp-body"></div><div class="tp-foot"><div id="tpStatus" class="tp-status"></div><button id="tpSave" type="button" class="tp-save">Сохранить прогресс</button></div></section>';
  document.body.appendChild(backdrop);

  var body=backdrop.querySelector('#tpBody');
  var status=backdrop.querySelector('#tpStatus');
  var save=backdrop.querySelector('#tpSave');
  var nameEl=backdrop.querySelector('#tpName');

  function close(){ backdrop.classList.remove('open'); currentStudent=null; }
  backdrop.querySelector('.tp-close').addEventListener('click',close);
  backdrop.addEventListener('click',function(e){ if(e.target===backdrop) close(); });

  function syncLevel(level){
    var courseEl=body.querySelector('.tp-course[data-level="'+level+'"]');
    if(!courseEl || courseEl.classList.contains('locked')) return;
    var inputs=[].slice.call(courseEl.querySelectorAll('input[data-module]'));
    var previous=true;
    inputs.forEach(function(input,index){
      var label=input.closest('.tp-module');
      if(index===0 || previous){
        input.disabled=false;
        label.classList.remove('disabled');
      }else{
        input.checked=false;
        input.disabled=true;
        label.classList.add('disabled');
      }
      var priorChecked=inputs.slice(0,index).every(function(x){return x.checked;});
      label.classList.toggle('current',!input.checked && !input.disabled && priorChecked);
      previous=previous && input.checked;
    });
  }

  function syncAll(){ for(var level=1;level<=7;level++) syncLevel(level); }

  async function openProgress(studentId){
    currentStudent=studentId;
    backdrop.classList.add('open');
    status.className='tp-status';
    status.textContent='Загрузка...';
    body.innerHTML='';

    var results=await Promise.all([
      db.from('profiles').select('full_name,email').eq('id',studentId).single(),
      db.from('course_access').select('course_level,access_granted').eq('student_id',studentId),
      db.from('student_progress').select('course_level,module_no,completed').eq('student_id',studentId)
    ]);

    if(results[0].error || results[1].error || results[2].error){
      console.error('Teacher progress load error',results);
      status.className='tp-status err';
      status.textContent='Не удалось загрузить прогресс. Выполните актуальный supabase-schema.sql.';
      return;
    }

    var student=results[0].data || {};
    nameEl.textContent=student.full_name || student.email || 'Ученик';
    var accessSet={};
    (results[1].data || []).forEach(function(row){ if(row.access_granted) accessSet[Number(row.course_level)]=true; });
    var done={};
    (results[2].data || []).forEach(function(row){ if(row.completed) done[Number(row.course_level)+'-'+Number(row.module_no)]=true; });

    var html='';
    for(var level=1;level<=7;level++){
      var allowed=!!accessSet[level];
      html+='<div class="tp-course '+(allowed?'':'locked')+'" data-level="'+level+'"><div class="tp-course-head"><strong>'+level+'. '+courseNames[level]+'</strong><span>'+(allowed?'Доступ открыт':'Нет доступа к ступени')+'</span></div><div class="tp-modules">';
      for(var n=1;n<=6;n++){
        html+='<label class="tp-module"><input type="checkbox" data-level="'+level+'" data-module="'+n+'" '+(done[level+'-'+n]?'checked':'')+' '+(allowed?'':'disabled')+'> Модуль '+n+'</label>';
      }
      html+='</div>'+(allowed?'<div class="tp-note">Подтвердите текущий модуль, сохраните — следующий откроется ученику автоматически.</div>':'')+'</div>';
    }
    body.innerHTML=html;
    syncAll();
    status.textContent='Подтверждение идёт строго по порядку: 1 → 2 → 3 → 4 → 5 → 6.';
  }

  body.addEventListener('change',function(e){
    var input=e.target;
    if(!input.matches('input[data-level][data-module]')) return;
    var level=Number(input.getAttribute('data-level'));
    var moduleNo=Number(input.getAttribute('data-module'));
    if(!input.checked){
      [].slice.call(body.querySelectorAll('input[data-level="'+level+'"]')).forEach(function(x){
        if(Number(x.getAttribute('data-module'))>moduleNo) x.checked=false;
      });
    }
    syncLevel(level);
  });

  save.addEventListener('click',async function(){
    if(!currentStudent) return;
    save.disabled=true;
    status.className='tp-status';
    status.textContent='Сохраняем...';
    syncAll();

    var rows=[];
    var now=new Date().toISOString();
    for(var level=1;level<=7;level++){
      var courseEl=body.querySelector('.tp-course[data-level="'+level+'"]');
      if(!courseEl || courseEl.classList.contains('locked')) continue;
      for(var n=1;n<=6;n++){
        var input=courseEl.querySelector('input[data-module="'+n+'"]');
        rows.push({student_id:currentStudent,course_level:level,module_no:n,completed:!!(input && input.checked),completed_at:(input && input.checked)?now:null});
      }
    }

    if(!rows.length){
      save.disabled=false;
      status.className='tp-status err';
      status.textContent='Сначала откройте ученику доступ хотя бы к одной ступени и сохраните доступы.';
      return;
    }

    var result=await db.from('student_progress').upsert(rows,{onConflict:'student_id,course_level,module_no'});
    save.disabled=false;
    if(result.error){
      console.error('Teacher progress save error',result.error);
      status.className='tp-status err';
      status.textContent='Не удалось сохранить прогресс. Выполните актуальный supabase-schema.sql.';
      return;
    }
    status.className='tp-status ok';
    status.textContent='✓ Прогресс сохранён. Следующий модуль ученику открыт автоматически.';
    save.textContent='Сохранено ✓';
    setTimeout(function(){save.textContent='Сохранить прогресс';},1800);
  });

  function injectButtons(){
    [].slice.call(document.querySelectorAll('.student[id^="student-"]')).forEach(function(card){
      var id=card.id.substring(8);
      var target=card.querySelector('.actions-right');
      if(!target || target.querySelector('.teacher-progress-btn')) return;
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='teacher-progress-btn';
      btn.textContent='Прогресс по модулям';
      btn.addEventListener('click',function(){ openProgress(id); });
      target.insertBefore(btn,target.firstChild);
    });
  }

  var observer=new MutationObserver(injectButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  injectButtons();
})();
