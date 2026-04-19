import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export default async function BookingPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!business) notFound()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('price_pence', { ascending: true })

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week', { ascending: true })

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const hoursLines = (availability ?? []).map(a => `${dayNames[a.day_of_week]}: ${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}`)

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Book — ${business.name}`}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@1,9..144,200;1,9..144,300&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          :root{--teal:#0D9488;--teal-dark:#0F766E;--teal-mid:#14B8A6;--teal-100:#CCFBF1;--teal-50:#F0FDFA;--teal-glow:rgba(13,148,136,0.15);--green:#16A34A;--white:#FFFFFF;--cream:#F5FAF8;--gray-200:#E5E7EB;--gray-400:#9CA3AF;--gray-500:#6B7280;--gray-600:#4B5563;--ink:#0D1F1A;--border:#E5E7EB;--gold:#F59E0B;--font:'Plus Jakarta Sans',system-ui,sans-serif;--serif:'Fraunces',Georgia,serif;--r:12px;--r-lg:18px;}
          html{background:var(--cream);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
          .page{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
          .left{background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
          .left-bar{height:5px;background:linear-gradient(90deg,var(--teal-dark),var(--teal-mid),var(--green))}
          .left-top{padding:24px 20px 18px;border-bottom:1px solid var(--border)}
          .biz-cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--teal);margin-bottom:6px}
          .biz-name{font-family:var(--serif);font-size:24px;font-weight:200;font-style:italic;color:var(--ink);line-height:1.2}
          .left-body{padding:16px 20px;flex:1;display:flex;flex-direction:column;gap:14px}
          .info-row{display:flex;gap:10px;align-items:flex-start}
          .info-icon{width:28px;height:28px;border-radius:8px;background:var(--teal-50);border:1px solid var(--teal-100);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
          .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--teal);margin-bottom:2px}
          .info-val{font-size:12px;color:var(--gray-600);font-weight:500;line-height:1.6}
          .powered{padding:12px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--gray-400)}
          .powered a{color:var(--teal);font-weight:700;text-decoration:none}
          .right{padding:32px 40px;overflow-y:auto}
          .pips{display:flex;gap:5px;margin-bottom:28px}
          .pip{flex:1;height:4px;border-radius:4px;background:var(--gray-200)}
          .pip.done{background:var(--teal)}.pip.active{background:var(--teal);opacity:0.45}
          .panel-title{font-family:var(--serif);font-size:24px;font-weight:200;font-style:italic;color:var(--ink);margin-bottom:4px}
          .panel-sub{font-size:13px;color:var(--gray-400);margin-bottom:20px}
          .slist{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
          .scard{border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;cursor:pointer;transition:all 0.2s;background:var(--white);display:flex;align-items:center;justify-content:space-between}
          .scard:hover{border-color:var(--teal-100)}.scard.sel{border-color:var(--teal);background:var(--teal-50)}
          .sn{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px}
          .sd{font-size:12px;color:var(--gray-400)}
          .sp{font-family:var(--serif);font-size:18px;font-weight:200;font-style:italic;color:var(--teal);white-space:nowrap;margin-left:12px}
          .btn{width:100%;padding:13px;background:var(--teal);color:white;border:none;border-radius:var(--r);font-size:14px;font-weight:800;font-family:var(--font);cursor:pointer;margin-top:4px}
          .btn:disabled{opacity:0.35;cursor:not-allowed}
          .back{background:none;border:none;color:var(--gray-400);font-size:12px;cursor:pointer;font-family:var(--font);padding:0 0 16px;font-weight:600;display:block}
          .calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
          .calm{font-family:var(--serif);font-size:17px;font-style:italic;font-weight:200}
          .calnav{display:flex;gap:5px}
          .calbtn{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-size:14px}
          .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:18px}
          .dn{text-align:center;font-size:10px;font-weight:700;color:var(--gray-400);padding:5px 0;text-transform:uppercase}
          .cd{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:8px;cursor:pointer;border:1.5px solid transparent;font-weight:500}
          .cd.sel{background:var(--teal);color:white}.cd.today{border-color:var(--gold)}.cd.past{color:var(--gray-200);cursor:default}.cd.off{color:var(--gray-200);cursor:default}
          .tlabel{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-400);margin-bottom:8px}
          .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:18px}
          .slot{padding:8px 4px;border:1.5px solid var(--border);border-radius:8px;background:var(--white);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);text-align:center}
          .slot.sel{background:var(--teal);color:white;border-color:var(--teal)}
          .ff{margin-bottom:10px}
          .frow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
          label{display:block;font-size:10px;font-weight:700;color:var(--gray-600);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.07em}
          input,textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:var(--font);color:var(--ink);background:var(--white);outline:none}
          input:focus,textarea:focus{border-color:var(--teal)}
          textarea{resize:none;height:64px}
          .sumbox{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px;margin:14px 0 0}
          .sr{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
          .sk{color:var(--gray-400)}.sv{font-weight:700}
          .sdiv{height:1px;background:var(--border);margin:8px 0}
          .stot{font-family:var(--serif);font-size:18px;font-style:italic;font-weight:200;color:var(--teal)}
          .sec{text-align:center;font-size:11px;color:var(--gray-400);margin-top:8px}
          @media(max-width:768px){.page{grid-template-columns:1fr}.left{position:static;height:auto}.right{padding:20px 16px}.sgrid{grid-template-columns:repeat(3,1fr)}.frow{grid-template-columns:1fr}}
        `}</style>
      </head>
      <body>
        <div className="page">
          <aside className="left">
            <div className="left-bar"></div>
            <div className="left-top">
              <div className="biz-cat">{business.category === 'salon_spa' ? 'Salon & Spa' : 'Fitness & Yoga'}</div>
              <div className="biz-name">{business.name}</div>
            </div>
            <div className="left-body">
              {business.address && <div className="info-row"><div className="info-icon">📍</div><div><div className="info-label">Location</div><div className="info-val">{business.address}</div></div></div>}
              {hoursLines.length > 0 && <div className="info-row"><div className="info-icon">🕐</div><div><div className="info-label">Hours</div>{hoursLines.map((l,i)=><div key={i} className="info-val">{l}</div>)}</div></div>}
              {business.phone && <div className="info-row"><div className="info-icon">📞</div><div><div className="info-label">Phone</div><div className="info-val">{business.phone}</div></div></div>}
              {business.email && <div className="info-row"><div className="info-icon">✉️</div><div><div className="info-label">Email</div><div className="info-val">{business.email}</div></div></div>}
            </div>
            <div className="powered">Powered by <a href="/">FastWellBook</a></div>
          </aside>
          <main className="right" id="app"></main>
        </div>

        <script id="biz-data" type="application/json" dangerouslySetInnerHTML={{__html: JSON.stringify({business, services: services ?? [], availability: availability ?? []})}} />

        <script dangerouslySetInnerHTML={{__html: `
(function(){
  var raw = document.getElementById('biz-data').textContent;
  var data = JSON.parse(raw);
  var business = data.business;
  var services = data.services;
  var availability = data.availability;
  var app = document.getElementById('app');
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var step = 1;
  var selSvc = null;
  var selDate = null;
  var selTime = null;
  var selTimeLabel = null;
  var curMo = new Date();
  curMo.setDate(1);

  function fmt(p){ return '£' + (p/100).toFixed(2); }

  function pips(cur){
    var h = '<div class="pips">';
    for(var i=1;i<=3;i++) h += '<div class="pip' + (i<cur?' done':i===cur?' active':'') + '"></div>';
    return h + '</div>';
  }

  function render(){
    if(step===1) renderStep1();
    else if(step===2) renderStep2();
    else renderStep3();
  }

  function renderStep1(){
    var h = pips(1) + '<div class="panel-title">Choose a service</div><div class="panel-sub">What would you like to book?</div><div class="slist">';
    for(var i=0;i<services.length;i++){
      var s = services[i];
      var sel = selSvc && selSvc.id === s.id;
      h += '<div class="scard' + (sel?' sel':'') + '" data-idx="' + i + '">';
      h += '<div><div class="sn">' + s.name + '</div><div class="sd">' + s.duration_mins + ' min' + (s.description ? ' · ' + s.description : '') + '</div></div>';
      h += '<div class="sp">' + fmt(s.price_pence) + '</div></div>';
    }
    h += '</div><button class="btn" id="btn1"' + (selSvc?'':' disabled') + '>Continue to date and time</button>';
    app.innerHTML = h;
    var cards = app.querySelectorAll('.scard');
    for(var j=0;j<cards.length;j++){
      cards[j].addEventListener('click', (function(idx){ return function(){ selSvc = services[idx]; render(); }; })(parseInt(cards[j].dataset.idx)));
    }
    var b = document.getElementById('btn1');
    if(b) b.addEventListener('click', function(){ if(selSvc){ step=2; render(); } });
  }

  function renderStep2(){
    var now = new Date(); now.setHours(0,0,0,0);
    var fd = new Date(curMo.getFullYear(), curMo.getMonth(), 1).getDay();
    var dim = new Date(curMo.getFullYear(), curMo.getMonth()+1, 0).getDate();
    var h = pips(2) + '<button class="back" id="back2">← Back</button>';
    h += '<div class="panel-title">Pick a date and time</div><div class="panel-sub">Choose when you would like to visit</div>';
    h += '<div class="calh"><span class="calm">' + MONTHS[curMo.getMonth()] + ' ' + curMo.getFullYear() + '</span>';
    h += '<div class="calnav"><button class="calbtn" id="prev">&#8249;</button><button class="calbtn" id="next">&#8250;</button></div></div>';
    h += '<div class="cgrid">';
    for(var d=0;d<7;d++) h += '<div class="dn">' + DAYS[d] + '</div>';
    for(var e=0;e<fd;e++) h += '<div></div>';
    for(var day=1;day<=dim;day++){
      var dt = new Date(curMo.getFullYear(), curMo.getMonth(), day);
      var past = dt < now;
      var dow = dt.getDay();
      var open = availability.some(function(a){ return a.day_of_week === dow; });
      var isSel = selDate && selDate.getDate()===day && selDate.getMonth()===curMo.getMonth();
      var isToday = dt.toDateString() === now.toDateString();
      var cls = 'cd' + (isSel?' sel':'') + (isToday?' today':'') + (past||!open?' past':'');
      h += '<div class="' + cls + '" data-day="' + day + '" data-dow="' + dow + '" data-past="' + (past||!open?'1':'0') + '">' + day + '</div>';
    }
    h += '</div>';
    if(selDate){
      var avail = availability.find(function(a){ return a.day_of_week === selDate.getDay(); });
      if(avail){
        var sh = parseInt(avail.start_time.split(':')[0]);
        var sm = parseInt(avail.start_time.split(':')[1]);
        var eh = parseInt(avail.end_time.split(':')[0]);
        var em = parseInt(avail.end_time.split(':')[1]);
        var cur = sh*60+sm;
        var end = eh*60+em;
        h += '<div class="tlabel">Available times — ' + selDate.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}) + '</div><div class="sgrid">';
        while(cur + selSvc.duration_mins <= end){
          var hh = Math.floor(cur/60); var mm = cur%60;
          var label = (hh>12?hh-12:hh||12) + ':' + (mm<10?'0'+mm:mm) + ' ' + (hh>=12?'pm':'am');
          var val = hh + ':' + mm;
          h += '<button class="slot' + (selTime===val?' sel':'') + '" data-val="' + val + '" data-label="' + label + '">' + label + '</button>';
          cur += 30;
        }
        h += '</div>';
      }
    }
    h += '<button class="btn" id="btn2"' + (selDate&&selTime?'':' disabled') + '>Continue to your details</button>';
    app.innerHTML = h;
    document.getElementById('back2').addEventListener('click', function(){ step=1; render(); });
    document.getElementById('prev').addEventListener('click', function(){ curMo.setMonth(curMo.getMonth()-1); selDate=null; selTime=null; render(); });
    document.getElementById('next').addEventListener('click', function(){ curMo.setMonth(curMo.getMonth()+1); selDate=null; selTime=null; render(); });
    var dayCells = app.querySelectorAll('.cd');
    for(var i=0;i<dayCells.length;i++){
      dayCells[i].addEventListener('click', (function(cell){
        return function(){
          if(cell.dataset.past==='1') return;
          selDate = new Date(curMo.getFullYear(), curMo.getMonth(), parseInt(cell.dataset.day));
          selTime = null;
          render();
        };
      })(dayCells[i]));
    }
    var slots = app.querySelectorAll('.slot');
    for(var j=0;j<slots.length;j++){
      slots[j].addEventListener('click', (function(slot){
        return function(){ selTime=slot.dataset.val; selTimeLabel=slot.dataset.label; render(); };
      })(slots[j]));
    }
    var b2 = document.getElementById('btn2');
    if(b2) b2.addEventListener('click', function(){ if(selDate&&selTime){ step=3; render(); } });
  }

  function renderStep3(){
    var h = pips(3) + '<button class="back" id="back3">← Back</button>';
    h += '<div class="panel-title">Your details</div><div class="panel-sub">Almost done</div>';
    h += '<div class="frow"><div><label>First name</label><input id="fn" placeholder="Jane"></div><div><label>Last name</label><input id="ln" placeholder="Smith"></div></div>';
    h += '<div class="ff"><label>Email</label><input type="email" id="em" placeholder="jane@example.com"></div>';
    h += '<div class="ff"><label>Phone (optional)</label><input type="tel" id="ph" placeholder="+44 7700 000000"></div>';
    h += '<div class="ff"><label>Notes (optional)</label><textarea id="nt" placeholder="Any requests..."></textarea></div>';
    h += '<div class="sumbox">';
    h += '<div class="sr"><span class="sk">Service</span><span class="sv">' + selSvc.name + '</span></div>';
    h += '<div class="sr"><span class="sk">Date</span><span class="sv">' + selDate.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}) + '</span></div>';
    h += '<div class="sr"><span class="sk">Time</span><span class="sv">' + selTimeLabel + '</span></div>';
    h += '<div class="sdiv"></div>';
    h += '<div class="sr"><span class="sk">Total</span><span class="sv stot">' + fmt(selSvc.price_pence) + '</span></div>';
    h += '</div>';
    h += '<button class="btn" id="paybtn" style="margin-top:14px">Confirm and pay ' + fmt(selSvc.price_pence) + '</button>';
    h += '<p class="sec">Secured by Stripe. Free cancellation 24h before.</p>';
    app.innerHTML = h;
    document.getElementById('back3').addEventListener('click', function(){ step=2; render(); });
    document.getElementById('paybtn').addEventListener('click', function(){
      var fn = document.getElementById('fn').value.trim();
      var em = document.getElementById('em').value.trim();
      if(!fn||!em){ alert('Please enter your name and email'); return; }
      var btn = document.getElementById('paybtn');
      btn.disabled = true; btn.textContent = 'Processing...';
      var starts = new Date(selDate);
      var parts = selTime.split(':');
      starts.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
      fetch('/api/bookings', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selSvc.id,
          startsAt: starts.toISOString(),
          guestName: fn + ' ' + document.getElementById('ln').value.trim(),
          guestEmail: em,
          guestPhone: document.getElementById('ph').value.trim() || undefined,
          notes: document.getElementById('nt').value.trim() || undefined
        })
      }).then(function(r){ return r.json(); }).then(function(d){
        if(d.checkoutUrl) window.location.href = d.checkoutUrl;
        else { alert(d.error||'Something went wrong'); btn.disabled=false; btn.textContent='Confirm and pay'; }
      }).catch(function(){ alert('Something went wrong'); btn.disabled=false; btn.textContent='Confirm and pay'; });
    });
  }

  render();
})();
        `}} />
      </body>
    </html>
  )
}
