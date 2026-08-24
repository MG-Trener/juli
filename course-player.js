(function(){
  'use strict';

  function byId(id){ return document.getElementById(id); }
  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  var level = Number(document.body.getAttribute('data-course-level'));
  var catalog = window.JULI_COURSE_STRUCTURE || {};
  var course = catalog[level];
  var app = byId('app');
  var notice = byId('notice');
  var modulesEl = byId('modules');
  var locked = byId('locked');
  var lockedTitle = byId('lockedTitle');
  var lockedText = byId('lockedText');
  var titleEl = byId('courseTitle');
  var subtitleEl = byId('courseSubtitle');
  var levelEl = byId('courseLevel');
  var out = byId('out');
  var profile = null;
  var completed = {};
  var db = null;

  function showError(title,text){
    if(app){ app.classList.add('hidden'); app.style.display='none'; }
    if(lockedTitle) lockedTitle.textContent = title;
    if(lockedText) lockedText.textContent = text;
    if(locked){ locked.classList.remove('hidden'); locked.style.display='grid'; }
  }

  function blockKind(text){
    var t = String(text || '').trim().toLowerCase();
    if(t.indexOf('практика')===0 || t.indexOf('задание')===0) return ['Практика','practice'];
    if(t.indexOf('важно')===0 || t.indexOf('обратите внимание')===0) return ['Важно','important'];
    if(t.indexOf('цель')===0) return ['Что вы изучите',''];
    if(t.indexOf('алгоритм')===0 || t.indexOf('последовательность')===0) return ['Алгоритм работы',''];
    if(t.indexOf('основн')===0 || t.indexOf('ключев')===0) return ['Ключевые моменты',''];
    return ['Теория',''];
  }

  function lessonHtml(content){
    return String(content || '').split(/\n\s*\n/).map(function(x){return x.trim();}).filter(Boolean).map(function(part){
      var kind = blockKind(part);
      return '<div class="lesson-block '+kind[1]+'"><strong>'+kind[0]+'</strong><p>'+escapeHtml(part)+'</p></div>';
    }).join('');
  }

  function contiguousDone(){
    if(!course || !course.modules) return 0;
    var n=0;
    while(n < course.modules.length && completed[n+1]===true) n++;
    return n;
  }

  function renderProgress(){
    if(profile && profile.role==='owner') return;
    var progress = byId('courseProgress');
    if(!progress){
      progress = document.createElement('section');
      progress.id='courseProgress';
      progress.className='course-progress';
      notice.parentNode.insertBefore(progress, notice.nextSibling);
    }
    var total=course.modules.length;
    var done=contiguousDone();
    var percent=Math.round(done/total*100);
    var current=done<total?done+1:total;
    var steps='';
    for(var i=1;i<=total;i++){
      var cls=i<=done?'done':(i===current && done<total?'current':'');
      steps+='<span class="'+cls+'">'+(i<=done?'✓':i)+'</span>';
    }
    progress.innerHTML='<div class="course-progress-top"><div><span class="course-progress-kicker">Ваш прогресс</span><strong>'+(done===total?'Ступень завершена':'Сейчас открыт модуль '+current+' из '+total)+'</strong></div><div class="course-progress-value">'+percent+'%</div></div><div class="course-progress-track"><div class="course-progress-fill" style="width:'+percent+'%"></div></div><div class="course-progress-steps">'+steps+'</div><div class="course-progress-note">'+(done===total?'Все модули подтверждены преподавателем.':'После подтверждения преподавателем текущего модуля автоматически откроется следующий.')+'</div>';
  }

  function renderModules(materials){
    var grouped={};
    (materials || []).forEach(function(row){
      var n=Number(row.module_no);
      if(!grouped[n]) grouped[n]=[];
      grouped[n].push(row);
    });
    var owner=profile && profile.role==='owner';
    var doneCount=contiguousDone();
    var unlockedThrough=owner?course.modules.length:Math.min(doneCount+1,course.modules.length);
    var html='';

    course.modules.forEach(function(def,index){
      var n=index+1;
      var rows=grouped[n] || [];
      var title=(rows[0] && rows[0].title) ? rows[0].title : def.title;
      var unlocked=owner || n<=unlockedThrough;
      var done=!owner && n<=doneCount;

      if(!unlocked){
        html+='<article class="module module-locked" id="module-'+n+'"><div class="module-lock-icon">🔒</div><div><div class="eyebrow">Модуль '+n+'</div><h2>'+escapeHtml(title)+'</h2><div class="module-locked-text">Содержание откроется после подтверждения преподавателем предыдущего модуля.</div></div></article>';
        return;
      }

      var content=rows.map(function(r){return r.content || '';}).filter(Boolean).join('\n\n');
      var currentClass=(!owner && n===unlockedThrough && doneCount<course.modules.length)?' current':'';
      html+='<article class="module '+(done?'completed':'')+currentClass+'" id="module-'+n+'"><div class="eyebrow">Модуль '+n+(done?' · ПРОЙДЕН':'')+'</div><h2>'+escapeHtml(title)+'</h2>'+(content?'<div class="lesson">'+lessonHtml(content)+'</div>':'<div class="module-empty">Материал модуля пока не опубликован преподавателем.</div>')+'<div class="module-footer"><span class="module-state">'+(owner?'Преподаватель просматривает опубликованный материал':done?'✓ Завершение подтверждено преподавателем':'Текущий модуль · ожидает подтверждения преподавателя')+'</span></div></article>';
    });
    modulesEl.innerHTML=html;
  }

  async function start(){
    try{
      if(!course){ showError('Структура курса не загружена','Обновите страницу.'); return; }
      document.title=course.title+' — JULI';
      titleEl.textContent=course.title;
      subtitleEl.textContent=course.subtitle || '';
      levelEl.textContent='Ступень '+level;

      if(!window.supabase || !window.JULI_SUPABASE_URL || !window.JULI_SUPABASE_ANON_KEY){
        showError('Авторизация недоступна','Не удалось подключить Supabase.'); return;
      }
      db=window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY);

      var userResult=await db.auth.getUser();
      var user=userResult && userResult.data ? userResult.data.user : null;
      if(!user){ location.href='login.html'; return; }

      var profileResult=await db.from('profiles').select('*').eq('id',user.id).single();
      if(profileResult.error || !profileResult.data){ showError('Профиль не найден','Войдите повторно или обратитесь к преподавателю.'); return; }
      profile=profileResult.data;

      if(profile.role!=='owner' && ((Object.prototype.hasOwnProperty.call(profile,'is_active') && !profile.is_active) || (Object.prototype.hasOwnProperty.call(profile,'archived') && profile.archived))){
        await db.auth.signOut(); location.href='login.html?blocked=1'; return;
      }

      var allowed=profile.role==='owner';
      if(!allowed){
        var accessResult=await db.from('course_access').select('access_granted').eq('student_id',user.id).eq('course_level',level).maybeSingle();
        if(accessResult.error){ showError('Не удалось проверить доступ','Обновите страницу или обратитесь к преподавателю.'); return; }
        allowed=!!(accessResult.data && accessResult.data.access_granted);
      }
      if(!allowed){ showError('Доступ к этой ступени закрыт','Преподаватель ещё не разрешил доступ к этому курсу.'); return; }

      if(profile.role!=='owner'){
        var progressResult=await db.from('student_progress').select('module_no,completed').eq('student_id',user.id).eq('course_level',level);
        if(progressResult.error){
          console.error('Progress error',progressResult.error);
          showError('Не удалось загрузить прогресс','Преподавателю нужно применить актуальный supabase-schema.sql.'); return;
        }
        (progressResult.data || []).forEach(function(row){ if(row.completed) completed[Number(row.module_no)]=true; });
      }

      var materialResult=await db.from('course_materials').select('module_no,title,content,sort_order').eq('course_level',level).eq('published',true).order('sort_order',{ascending:true}).order('module_no',{ascending:true});
      if(materialResult.error){
        console.error('Materials error',materialResult.error);
        showError('Материалы временно недоступны','Проверьте актуальную схему Supabase и доступ к курсу.'); return;
      }

      locked.classList.add('hidden');
      locked.style.display='none';
      app.classList.remove('hidden');
      app.style.display='block';
      notice.textContent=profile.role==='owner'?'Режим преподавателя: просмотр опубликованной версии курса.':'Материалы открываются последовательно. Следующий модуль открывает преподаватель после подтверждения текущего.';
      renderProgress();
      renderModules(materialResult.data || []);

      if(location.hash){
        setTimeout(function(){
          var target=document.querySelector(location.hash);
          if(target && !target.classList.contains('module-locked')) target.scrollIntoView({behavior:'smooth',block:'start'});
        },50);
      }
    }catch(err){
      console.error('Course player error',err);
      showError('Не удалось открыть курс','Произошла ошибка загрузки курса. Обновите страницу или обратитесь к преподавателю.');
    }
  }

  if(out){
    out.addEventListener('click',async function(){
      try{ if(db) await db.auth.signOut(); }catch(e){}
      location.href='./';
    });
  }

  start();
})();
