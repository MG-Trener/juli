(function(){'use strict';
let busy=false;
const db=(window.supabase&&window.JULI_SUPABASE_URL&&window.JULI_SUPABASE_ANON_KEY)?window.supabase.createClient(window.JULI_SUPABASE_URL,window.JULI_SUPABASE_ANON_KEY):null;
if(!db)return;
function groupId(card){const b=card.querySelector('button[onclick*="openGroup"]');const m=(b?.getAttribute('onclick')||'').match(/openGroup\((\d+)\)/);return m?Number(m[1]):0;}
async function refresh(){if(busy)return;const cards=[...document.querySelectorAll('#groups .group-card')];if(!cards.length)return;busy=true;try{
 const [gmR,aR,pR]=await Promise.all([db.from('student_group_members').select('group_id,student_id'),db.from('course_access').select('student_id,course_level,access_granted').eq('access_granted',true),db.from('student_progress').select('student_id,course_level,module_no,completed').eq('completed',true)]);
 if(gmR.error||aR.error||pR.error)return;
 const gm=gmR.data||[],access=aR.data||[],progress=pR.data||[];
 for(const card of cards){const gid=groupId(card);if(!gid)continue;const members=gm.filter(x=>Number(x.group_id)===gid).map(x=>x.student_id);const memberSet=new Set(members);const opened=access.filter(x=>memberSet.has(x.student_id));let sum=0,count=0;for(const a of opened){const d=progress.filter(p=>p.student_id===a.student_id&&Number(p.course_level)===Number(a.course_level)).length;sum+=Math.min(d,6)/6*100;count++;}const avg=count?Math.round(sum/count):0;let box=card.querySelector('.group-insights');if(!box){box=document.createElement('div');box.className='group-insights';card.querySelector('.group-card-head>div')?.appendChild(box);}if(box)box.innerHTML=`<span class="group-insight"><b>${members.length}</b> учеников</span><span class="group-insight"><b>${opened.length}</b> открыто ступеней</span><span class="group-insight ${avg===100?'good':''}"><b>${avg}%</b> средний прогресс</span>`;}
 }catch(e){console.error('Group insights:',e)}finally{busy=false}}
function later(){setTimeout(refresh,300);setTimeout(refresh,1200)}
document.addEventListener('click',e=>{if(e.target.closest('[data-tab="groups"]')||e.target.closest('#createGroup')||e.target.closest('#groups button')||e.target.closest('.modal-actions button'))later();});
let tries=0;const timer=setInterval(()=>{tries++;refresh();if(document.querySelector('#groups .group-card')||tries>20)clearInterval(timer)},300);
})();