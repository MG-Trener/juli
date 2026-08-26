(function(){'use strict';
const $=id=>document.getElementById(id);
function rows(){return [...document.querySelectorAll('#students .student-tr')];}
function cellHasValue(el){const t=(el?.textContent||'').trim();return t!==''&&t!=='—';}
function apply(){const mode=$('studentQuickFilter')?.value||'';let visible=0;for(const row of rows()){
  const c=row.children;
  const hasTeacher=cellHasValue(c[2]);
  const hasGroup=cellHasValue(c[3]);
  const hasAccess=cellHasValue(c[4]);
  let show=true;
  if(mode==='no-teacher')show=!hasTeacher;
  else if(mode==='no-group')show=!hasGroup;
  else if(mode==='no-access')show=!hasAccess;
  else if(mode==='ready')show=hasTeacher&&hasGroup&&hasAccess;
  row.hidden=!show;
  if(show)visible++;
 }
 const note=$('studentQuickCount');if(note)note.textContent=`После быстрого фильтра: ${visible}`;
}
function selectVisible(){for(const cb of document.querySelectorAll('#students .student-tr:not([hidden]) .sel-student'))if(!cb.checked)cb.click();}
function clearSelection(){for(const cb of document.querySelectorAll('#students .sel-student:checked'))cb.click();}
function reset(){const q=$('studentSearch'),t=$('studentTeacherFilter'),g=$('studentGroupFilter'),f=$('studentQuickFilter');if(q)q.value='';if(t)t.value='';if(g)g.value='';if(f)f.value='';q?.dispatchEvent(new Event('input',{bubbles:true}));t?.dispatchEvent(new Event('change',{bubbles:true}));g?.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(apply,80);}
$('studentQuickFilter')?.addEventListener('change',apply);
$('selectVisibleStudents')?.addEventListener('click',selectVisible);
$('clearStudentSelection')?.addEventListener('click',clearSelection);
$('resetStudentFilters')?.addEventListener('click',reset);
$('section-students')?.addEventListener('input',()=>setTimeout(apply,0));
$('section-students')?.addEventListener('change',()=>setTimeout(apply,0));
document.addEventListener('click',e=>{if(e.target.closest('[data-tab="students"]'))setTimeout(apply,120);});
let tries=0;const timer=setInterval(()=>{tries++;if(rows().length||tries>24){apply();clearInterval(timer)}},250);
})();