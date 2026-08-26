(function(){'use strict';
const courses=['','Парикмахер с нуля','Женские стрижки','Колористика','Блонд без ошибок','Современные окрашивания','Продвинутый мастер','Колорист-эксперт'];
const db=(window.supabase&&window.JULI_SUPABASE_URL&&window.JULI_SUPABASE_ANON_KEY)?window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let me=null,students=[],levels=[],access=[],progress=[];
function status(text,type=''){const e=$('status');e.className='status '+type;e.textContent=text}
const doneCount=(student,level)=>progress.filter(x=>x.student_id===student&&Number(x.course_level)===Number(level)&&x.completed).length;
function allowedLevels(studentId){const opened=new Set(access.filter(x=>x.student_id===studentId&&x.access_granted).map(x=>Number(x.course_level)));return levels.filter(l=>opened.has(l));}
function render(){
 $('teacherName').textContent=me?.full_name||'Учитель';if($('currentUserName'))$('currentUserName').textContent=me?.full_name||me?.email||'Учитель';
 $('courseChips').innerHTML=levels.length?levels.map(l=>`<span class="chip">${l}. ${courses[l]}</span>`).join(''):'<span class="muted">Суперучитель пока не назначил вам ступени.</span>';
 $('students').innerHTML=students.length?students.map(studentCard).join(''):'<div class="empty">Суперучитель пока не назначил вам учеников.</div>';
}
function studentCard(s){const available=allowedLevels(s.id);return `<article class="card"><div class="card-head"><div><div class="name">${esc(s.full_name||'Ученик')}</div><div class="email">${esc(s.email)}</div></div><span class="badge">Назначен вам</span></div>${available.length?available.map(level=>{const done=doneCount(s.id,level),pct=Math.round(done/6*100);return `<div class="course-row"><div class="course-title"><small>СТУПЕНЬ ${level}</small><strong>${courses[level]}</strong></div><div class="progress"><div class="line"><span>${done} из 6</span><strong>${pct}%</strong></div><div class="track"><div class="fill" style="width:${pct}%"></div></div></div><a class="btn" href="teacher-progress.html?student=${encodeURIComponent(s.id)}&level=${level}">Управлять модулями</a></div>`}).join(''):'<div class="empty" style="margin:14px">У ученика пока нет ступеней, открытых Суперучителем и доступных вам.</div>'}</article>`}
async function loadData(){
 const [tc,ts]=await Promise.all([db.from('teacher_course_assignments').select('course_level').eq('teacher_id',me.id),db.from('teacher_student_assignments').select('student_id').eq('teacher_id',me.id)]);if(tc.error||ts.error)throw tc.error||ts.error;
 levels=(tc.data||[]).map(x=>Number(x.course_level)).sort((a,b)=>a-b);const ids=(ts.data||[]).map(x=>x.student_id);
 if(ids.length){const p=await db.from('profiles').select('id,full_name,email,is_active,archived,role').in('id',ids);if(p.error)throw p.error;students=(p.data||[]).filter(x=>x.role==='student'&&x.is_active&&!x.archived)}else students=[];
 const [a,pr]=await Promise.all([db.from('course_access').select('student_id,course_level,access_granted'),db.from('student_progress').select('student_id,course_level,module_no,completed')]);if(a.error||pr.error)throw a.error||pr.error;access=a.data||[];progress=pr.data||[];
}
async function init(){if(!db){location.href='login.html';return}const u=await db.auth.getUser();if(!u.data.user){location.href='login.html';return}const p=await db.from('profiles').select('*').eq('id',u.data.user.id).single();if(p.error||!p.data){location.href='login.html';return}me=p.data;if(me.role==='superteacher'){location.href='admin.html';return}if(me.role==='candidate'){location.href='candidate.html';return}if(me.role!=='teacher'){location.href='student.html';return}if(!me.is_active||me.archived){await db.auth.signOut();location.href='login.html?blocked=1';return}try{await loadData();render();status('Показываются только ступени, предварительно открытые ученику Суперучителем.')}catch(e){console.error(e);status('Не удалось загрузить назначения.','err')}}
$('out').addEventListener('click',async()=>{await db.auth.signOut();location.href='./'});init();
})();