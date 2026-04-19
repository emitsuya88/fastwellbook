import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!business) return new NextResponse('Not found', { status: 404 })

  const { data: services } = await supabase
    .from('services').select('*').eq('business_id', business.id).eq('active', true).order('price_pence', { ascending: true })

  const { data: availability } = await supabase
    .from('availability').select('*').eq('business_id', business.id).order('day_of_week', { ascending: true })

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const hoursLines = (availability ?? []).map((a: any) =>
    `${dayNames[a.day_of_week]}: ${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}`
  ).join('<br>')

  const jsonData = JSON.stringify({ business, services: services ?? [], availability: availability ?? [] })
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Book — ${business.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--t:#0D9488;--td:#0F766E;--tm:#14B8A6;--t1:#CCFBF1;--t0:#F0FDFA;--g:#16A34A;--w:#fff;--cr:#F5FAF8;--g2:#E5E7EB;--g4:#9CA3AF;--g6:#4B5563;--ink:#0D1F1A;--bd:#E5E7EB;--gd:#F59E0B;--f:'Plus Jakarta Sans',system-ui,sans-serif;--r:12px;--rl:18px}
html,body{min-height:100vh;background:var(--cr);color:var(--ink);font-family:var(--f);-webkit-font-smoothing:antialiased}
.page{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
.left{background:var(--w);border-right:1px solid var(--bd);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
.bar{height:5px;background:linear-gradient(90deg,var(--td),var(--tm),var(--g))}
.ltop{padding:24px 20px 18px;border-bottom:1px solid var(--bd)}
.cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t);margin-bottom:6px}
.bn{font-size:24px;font-weight:300;font-style:italic;color:var(--ink);line-height:1.2}
.lb{padding:16px 20px;flex:1;display:flex;flex-direction:column;gap:14px}
.ir{display:flex;gap:10px;align-items:flex-start}
.ii{width:28px;height:28px;border-radius:8px;background:var(--t0);border:1px solid var(--t1);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.il{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--t);margin-bottom:2px}
.iv{font-size:12px;color:var(--g6);font-weight:500;line-height:1.6}
.pw{padding:12px 20px;border-top:1px solid var(--bd);font-size:11px;color:var(--g4)}
.pw a{color:var(--t);font-weight:700;text-decoration:none}
.right{padding:32px 40px;overflow-y:auto}
.pips{display:flex;gap:5px;margin-bottom:28px}
.pip{flex:1;height:4px;border-radius:4px;background:var(--g2)}
.pip.done{background:var(--t)}.pip.active{background:var(--t);opacity:.45}
.pt{font-size:24px;font-weight:300;font-style:italic;color:var(--ink);margin-bottom:4px}
.ps{font-size:13px;color:var(--g4);margin-bottom:20px}
.sl{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.sc{border:1.5px solid var(--bd);border-radius:var(--rl);padding:14px 16px;cursor:pointer;background:var(--w);display:flex;align-items:center;justify-content:space-between;transition:all .2s}
.sc:hover{border-color:var(--t1)}.sc.sel{border-color:var(--t);background:var(--t0)}
.sn{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px}.sd{font-size:12px;color:var(--g4)}
.sp{font-size:18px;font-weight:300;font-style:italic;color:var(--t);white-space:nowrap;margin-left:12px}
.btn{width:100%;padding:13px;background:var(--t);color:#fff;border:none;border-radius:var(--r);font-size:14px;font-weight:800;cursor:pointer;margin-top:4px;font-family:var(--f)}
.btn:disabled{opacity:.35;cursor:not-allowed}
.back{background:none;border:none;color:var(--g4);font-size:12px;cursor:pointer;padding:0 0 16px;font-weight:600;display:block;font-family:var(--f)}
.calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.calm{font-size:17px;font-style:italic;font-weight:300}
.cn{display:flex;gap:5px}
.cb{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--bd);background:var(--w);cursor:pointer;font-size:16px}
.cg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:18px}
.dn{text-align:center;font-size:10px;font-weight:700;color:var(--g4);padding:5px 0;text-transform:uppercase}
.cd{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:8px;cursor:pointer;border:1.5px solid transparent;font-weight:500}
.cd.sel{background:var(--t);color:#fff}.cd.today{border-color:var(--gd)}.cd.off{color:var(--g2);cursor:default}
.tl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--g4);margin-bottom:8px}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:18px}
.slot{padding:8px 4px;border:1.5px solid var(--bd);border-radius:8px;background:var(--w);font-size:12px;font-weight:600;cursor:pointer;text-align:center;font-family:var(--f)}
.slot.sel{background:var(--t);color:#fff;border-color:var(--t)}
.ff{margin-bottom:10px}.fr{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
label{display:block;font-size:10px;font-weight:700;color:var(--g6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.07em}
input,textarea{width:100%;padding:10px 12px;border:1.5px solid var(--bd);border-radius:var(--r);font-size:13px;color:var(--ink);background:var(--w);outline:none;font-family:var(--f)}
input:focus,textarea:focus{border-color:var(--t)}textarea{resize:none;height:64px}
.sb{background:var(--w);border:1.5px solid var(--bd);border-radius:var(--rl);padding:14px;margin:14px 0 0}
.sr{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.sk{color:var(--g4)}.sv{font-weight:700}
.sdv{height:1px;background:var(--bd);margin:8px 0}
.stot{font-size:18px;font-style:italic;font-weight:300;color:var(--t)}
.sec{text-align:center;font-size:11px;color:var(--g4);margin-top:8px}
@media(max-width:768px){.page{grid-template-columns:1fr}.left{position:static;height:auto}.right{padding:20px 16px}.sg{grid-template-columns:repeat(3,1fr)}.fr{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="page">
<div class="left">
<div class="bar"></div>
<div class="ltop"><div class="cat">${business.category === 'salon_spa' ? 'Salon & Spa' : 'Fitness & Yoga'}</div><div class="bn">${business.name}</div></div>
<div class="lb">
${business.address ? `<div class="ir"><div class="ii">📍</div><div><div class="il">Location</div><div class="iv">${business.address}</div></div></div>` : ''}
${hoursLines ? `<div class="ir"><div class="ii">🕐</div><div><div class="il">Hours</div><div class="iv">${hoursLines}</div></div></div>` : ''}
${business.phone ? `<div class="ir"><div class="ii">📞</div><div><div class="il">Phone</div><div class="iv">${business.phone}</div></div></div>` : ''}
${business.email ? `<div class="ir"><div class="ii">✉️</div><div><div class="il">Email</div><div class="iv">${business.email}</div></div></div>` : ''}
</div>
<div class="pw">Powered by <a href="/">FastWellBook</a></div>
</div>
<div class="right" id="app"></div>
</div>
<script>
var D=${jsonData};
var biz=D.business,svcs=D.services,avail=D.availability;
var app=document.getElementById('app');
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var step=1,ss=null,sd=null,st=null,stl=null,mo=new Date();mo.setDate(1);
function fmt(p){return'£'+(p/100).toFixed(2);}
function pips(c){var h='<div class="pips">';for(var i=1;i<=3;i++)h+='<div class="pip'+(i<c?' done':i===c?' active':'')+'"></div>';return h+'</div>';}
function go(){if(step===1)p1();else if(step===2)p2();else p3();}
function p1(){
  var h=pips(1)+'<div class="pt">Choose a service</div><div class="ps">What would you like to book?</div><div class="sl">';
  for(var i=0;i<svcs.length;i++){var s=svcs[i];h+='<div class="sc'+(ss&&ss.id===s.id?' sel':'')+'" data-i="'+i+'"><div><div class="sn">'+s.name+'</div><div class="sd">'+s.duration_mins+' min'+(s.description?' — '+s.description:'')+'</div></div><div class="sp">'+fmt(s.price_pence)+'</div></div>';}
  h+='</div><button class="btn" id="b1"'+(ss?'':' disabled')+'>Continue to date and time</button>';
  app.innerHTML=h;
  app.querySelectorAll('.sc').forEach(function(c){c.onclick=function(){ss=svcs[parseInt(c.dataset.i)];go();};});
  var b=document.getElementById('b1');if(b)b.onclick=function(){if(ss){step=2;go();}};
}
function p2(){
  var now=new Date();now.setHours(0,0,0,0);
  var fd=new Date(mo.getFullYear(),mo.getMonth(),1).getDay();
  var dim=new Date(mo.getFullYear(),mo.getMonth()+1,0).getDate();
  var h=pips(2)+'<button class="back" id="bk2">← Back</button><div class="pt">Pick a date and time</div><div class="ps">Choose when to visit</div>';
  h+='<div class="calh"><span class="calm">'+MONTHS[mo.getMonth()]+' '+mo.getFullYear()+'</span><div class="cn"><button class="cb" id="pv">‹</button><button class="cb" id="nx">›</button></div></div>';
  h+='<div class="cg">';
  for(var d=0;d<7;d++)h+='<div class="dn">'+DAYS[d]+'</div>';
  for(var e=0;e<fd;e++)h+='<div></div>';
  for(var day=1;day<=dim;day++){
    var dt=new Date(mo.getFullYear(),mo.getMonth(),day);
    var past=dt<now,dow=dt.getDay();
    var open=avail.some(function(a){return a.day_of_week===dow;});
    var isSel=sd&&sd.getDate()===day&&sd.getMonth()===mo.getMonth();
    var isToday=dt.toDateString()===now.toDateString();
    h+='<div class="cd'+(isSel?' sel':'')+(isToday?' today':'')+(past||!open?' off':'')+'" data-day="'+day+'" data-ok="'+(past||!open?0:1)+'">'+day+'</div>';
  }
  h+='</div>';
  if(sd){var av=avail.find(function(a){return a.day_of_week===sd.getDay();});if(av){var sh=parseInt(av.start_time),sm=parseInt(av.start_time.split(':')[1]),eh=parseInt(av.end_time),em=parseInt(av.end_time.split(':')[1]);var cur=sh*60+sm,end=eh*60+em;h+='<div class="tl">Times for '+sd.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div><div class="sg">';while(cur+ss.duration_mins<=end){var hh=Math.floor(cur/60),mm=cur%60;var lbl=(hh>12?hh-12:hh||12)+':'+(mm<10?'0'+mm:mm)+' '+(hh>=12?'pm':'am');var val=hh+':'+mm;h+='<button class="slot'+(st===val?' sel':'')+'" data-v="'+val+'" data-l="'+lbl+'">'+lbl+'</button>';cur+=30;}h+='</div>';}}
  h+='<button class="btn" id="b2"'+(sd&&st?'':' disabled')+'>Continue to your details</button>';
  app.innerHTML=h;
  document.getElementById('bk2').onclick=function(){step=1;go();};
  document.getElementById('pv').onclick=function(){mo.setMonth(mo.getMonth()-1);sd=null;st=null;go();};
  document.getElementById('nx').onclick=function(){mo.setMonth(mo.getMonth()+1);sd=null;st=null;go();};
  app.querySelectorAll('.cd').forEach(function(c){c.onclick=function(){if(c.dataset.ok==='0')return;sd=new Date(mo.getFullYear(),mo.getMonth(),parseInt(c.dataset.day));st=null;go();};});
  app.querySelectorAll('.slot').forEach(function(s){s.onclick=function(){st=s.dataset.v;stl=s.dataset.l;go();};});
  var b2=document.getElementById('b2');if(b2)b2.onclick=function(){if(sd&&st){step=3;go();}};
}
function p3(){
  var h=pips(3)+'<button class="back" id="bk3">← Back</button><div class="pt">Your details</div><div class="ps">Almost done</div>';
  h+='<div class="fr"><div><label>First name</label><input id="fn" placeholder="Jane"></div><div><label>Last name</label><input id="ln" placeholder="Smith"></div></div>';
  h+='<div class="ff"><label>Email</label><input type="email" id="em" placeholder="jane@example.com"></div>';
  h+='<div class="ff"><label>Phone (optional)</label><input type="tel" id="ph" placeholder="+44 7700 000000"></div>';
  h+='<div class="ff"><label>Notes (optional)</label><textarea id="nt" placeholder="Any requests..."></textarea></div>';
  h+='<div class="sb"><div class="sr"><span class="sk">Service</span><span class="sv">'+ss.name+'</span></div><div class="sr"><span class="sk">Date</span><span class="sv">'+sd.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</span></div><div class="sr"><span class="sk">Time</span><span class="sv">'+stl+'</span></div><div class="sdv"></div><div class="sr"><span class="sk">Total</span><span class="sv stot">'+fmt(ss.price_pence)+'</span></div></div>';
  h+='<button class="btn" id="pay" style="margin-top:14px">Confirm and pay '+fmt(ss.price_pence)+'</button><p class="sec">Secured by Stripe. Free cancellation 24h before.</p>';
  app.innerHTML=h;
  document.getElementById('bk3').onclick=function(){step=2;go();};
  document.getElementById('pay').onclick=function(){
    var fn=document.getElementById('fn').value.trim(),em=document.getElementById('em').value.trim();
    if(!fn||!em){alert('Please enter your name and email');return;}
    var btn=document.getElementById('pay');btn.disabled=true;btn.textContent='Processing...';
    var starts=new Date(sd);var pts=st.split(':');starts.setHours(parseInt(pts[0]),parseInt(pts[1]),0,0);
    fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId:biz.id,serviceId:ss.id,startsAt:starts.toISOString(),guestName:fn+' '+document.getElementById('ln').value.trim(),guestEmail:em,guestPhone:document.getElementById('ph').value.trim()||undefined,notes:document.getElementById('nt').value.trim()||undefined})})
    .then(function(r){return r.json();}).then(function(d){if(d.checkoutUrl)window.location.href=d.checkoutUrl;else{alert(d.error||'Something went wrong');btn.disabled=false;btn.textContent='Confirm and pay';}})
    .catch(function(){alert('Something went wrong');btn.disabled=false;btn.textContent='Confirm and pay';});
  };
}
go();
</script>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
