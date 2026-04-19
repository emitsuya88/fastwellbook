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

  const hoursLines = (availability ?? []).map(a => {
    const start = a.start_time.slice(0,5)
    const end = a.end_time.slice(0,5)
    return `${dayNames[a.day_of_week]}: ${start}–${end}`
  })

  const businessData = JSON.stringify({ business, services: services ?? [], availability: availability ?? [] })

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Book — ${business.name}`}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@1,9..144,200;1,9..144,300&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          :root{
            --teal:#0D9488;--teal-dark:#0F766E;--teal-mid:#14B8A6;
            --teal-100:#CCFBF1;--teal-50:#F0FDFA;--teal-glow:rgba(13,148,136,0.15);
            --green:#16A34A;--white:#FFFFFF;--cream:#F5FAF8;
            --gray-200:#E5E7EB;--gray-400:#9CA3AF;--gray-500:#6B7280;--gray-600:#4B5563;--gray-800:#1F2937;
            --ink:#0D1F1A;--border:#E5E7EB;--gold:#F59E0B;
            --font:'Plus Jakarta Sans',system-ui,sans-serif;--serif:'Fraunces',Georgia,serif;
            --r:12px;--r-lg:18px;
          }
          html{background:var(--cream);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
          body{min-height:100vh}
          .page{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
          .left{background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
          .left-bar{height:5px;background:linear-gradient(90deg,var(--teal-dark),var(--teal-mid),var(--green))}
          .left-top{padding:24px 20px 18px;border-bottom:1px solid var(--border)}
          .biz-cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--teal);margin-bottom:6px}
          .biz-name{font-family:var(--serif);font-size:24px;font-weight:200;font-style:italic;color:var(--ink);line-height:1.2}
          .biz-desc{font-size:12px;color:var(--gray-500);line-height:1.6;margin-top:6px}
          .left-body{padding:16px 20px;flex:1;display:flex;flex-direction:column;gap:14px}
          .info-row{display:flex;gap:10px;align-items:flex-start}
          .info-icon{width:28px;height:28px;border-radius:8px;background:var(--teal-50);border:1px solid var(--teal-100);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
          .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--teal);margin-bottom:2px}
          .info-val{font-size:12px;color:var(--gray-600);font-weight:500;line-height:1.5}
          .powered{padding:12px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--gray-400)}
          .powered a{color:var(--teal);font-weight:700;text-decoration:none}
          .right{padding:32px 40px;overflow-y:auto}
          .pips{display:flex;gap:5px;margin-bottom:28px}
          .pip{flex:1;height:4px;border-radius:4px;background:var(--gray-200);transition:background 0.3s}
          .pip.done{background:var(--teal)}.pip.active{background:var(--teal);opacity:0.45}
          .panel-title{font-family:var(--serif);font-size:24px;font-weight:200;font-style:italic;color:var(--ink);margin-bottom:4px}
          .panel-sub{font-size:13px;color:var(--gray-400);margin-bottom:20px}
          .slist{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
          .scard{border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;cursor:pointer;transition:all 0.2s;background:var(--white);display:flex;align-items:center;justify-content:space-between}
          .scard:hover{border-color:var(--teal-100);box-shadow:0 4px 16px rgba(0,0,0,0.06)}
          .scard.sel{border-color:var(--teal);background:var(--teal-50)}
          .sn{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px}
          .sd{font-size:12px;color:var(--gray-400)}
          .sp{font-family:var(--serif);font-size:18px;font-weight:200;font-style:italic;color:var(--teal);white-space:nowrap;margin-left:12px}
          .btn-primary{width:100%;padding:13px;background:var(--teal);color:white;border:none;border-radius:var(--r);font-size:14px;font-weight:800;font-family:var(--font);cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px var(--teal-glow)}
          .btn-primary:hover{background:var(--teal-dark);transform:translateY(-1px)}
          .btn-primary:disabled{opacity:0.35;cursor:not-allowed;transform:none}
          .back-btn{background:none;border:none;color:var(--gray-400);font-size:12px;cursor:pointer;font-family:var(--font);padding:0 0 16px;font-weight:600}
          .calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
          .calm{font-family:var(--serif);font-size:17px;font-style:italic;font-weight:200;color:var(--ink)}
          .calnav{display:flex;gap:5px}
          .calbtn{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
          .calbtn:hover{background:var(--teal);color:white;border-color:var(--teal)}
          .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:18px}
          .cday-name{text-align:center;font-size:10px;font-weight:700;color:var(--gray-400);padding:5px 0;text-transform:uppercase}
          .cday{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:8px;cursor:pointer;border:1.5px solid transparent;transition:all 0.15s;color:var(--ink);font-weight:500}
          .cday:hover:not(.empty):not(.past){background:var(--teal-50);border-color:var(--teal-100)}
          .cday.sel{background:var(--teal)!important;color:white!important;border-color:var(--teal)!important}
          .cday.today{border-color:var(--gold);font-weight:700}
          .cday.past{color:var(--gray-200);cursor:default}.cday.empty{cursor:default}
          .tlabel{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-400);margin-bottom:8px}
          .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:18px}
          .slotbtn{padding:8px 4px;border:1.5px solid var(--border);border-radius:8px;background:var(--white);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);color:var(--ink);transition:all 0.15s;text-align:center}
          .slotbtn:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-50)}
          .slotbtn.sel{background:var(--teal);color:white;border-color:var(--teal)}
          .ff{margin-bottom:10px}
          .frow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
          label{display:block;font-size:10px;font-weight:700;color:var(--gray-600);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.07em}
          input,textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:var(--font);color:var(--ink);background:var(--white);outline:none;transition:all 0.15s;font-weight:500}
          input:focus,textarea:focus{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-50)}
          input::placeholder,textarea::placeholder{color:var(--gray-400);font-weight:400}
          textarea{resize:none;height:64px;line-height:1.5}
          .sumbox{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px;margin:14px 0 0}
          .sumrow{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
          .sumk{color:var(--gray-400)}.sumv{font-weight:700}
          .sumdiv{height:1px;background:var(--border);margin:8px 0}
          .sum-total{font-family:var(--serif);font-size:18px;font-style:italic;font-weight:200;color:var(--teal)}
          .sec-note{text-align:center;font-size:11px;color:var(--gray-400);margin-top:8px}
          .no-svc{text-align:center;padding:32px;color:var(--gray-400);font-size:14px}
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
              {business.description && <div className="biz-desc">{business.description}</div>}
            </div>
            <div className="left-body">
              {business.address && (
                <div className="info-row">
                  <div className="info-icon">📍</div>
                  <div><div className="info-label">Location</div><div className="info-val">{business.address}</div></div>
                </div>
              )}
              {hoursLines.length > 0 && (
                <div className="info-row">
                  <div className="info-icon">🕐</div>
                  <div>
                    <div className="info-label">Hours</div>
                    {hoursLines.map((line, i) => (
                      <div key={i} className="info-val">{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {business.phone && (
                <div className="info-row">
                  <div className="info-icon">📞</div>
                  <div><div className="info-label">Phone</div><div className="info-val">{business.phone}</div></div>
                </div>
              )}
              {business.email && (
                <div className="info-row">
                  <div className="info-icon">✉️</div>
                  <div><div className="info-label">Email</div><div className="info-val">{business.email}</div></div>
                </div>
              )}
            </div>
            <div className="powered">Powered by <a href="/">FastWellBook</a></div>
          </aside>

          <main className="right">
            <div id="app" data-biz={businessData}></div>
          </main>
        </div>

        <script dangerouslySetInnerHTML={{__html:`
          const raw=document.getElementById('app').dataset.biz
          const {business,services,availability}=JSON.parse(raw)
          const app=document.getElementById('app')
          const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
          const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
          let S={step:1,svc:null,date:null,time:null,timeLabel:null,mo:new Date()}
          S.mo.setDate(1)

          function fmt(p){return'£'+(p/100).toFixed(2)}

          function pips(cur){
            return'<div class="pips">'+[1,2,3].map(i=>'<div class="pip '+(i<cur?'done':i===cur?'active':'')+'"></div>').join('')+'</div>'
          }

          function render(){
            if(S.step===1)step1()
            else if(S.step===2)step2()
            else step3()
          }

          function step1(){
            let html=pips(1)+'<div class="panel-title">Choose a service</div><div class="panel-sub">What would you like to book?</div>'
            if(!services||!services.length){
              html+='<div class="no-svc">No services available yet — please contact the business directly.</div>'
            } else {
              html+='<div class="slist">'+services.map(s=>{
                const sel=S.svc&&S.svc.id===s.id
                return'<div class="scard'+(sel?' sel':'')+'" onclick=\'selSvc('+JSON.stringify(s).replace(/'/g,"\\'")+')\'>'
                  +'<div><div class="sn">'+s.name+'</div><div class="sd">'+s.duration_mins+' min'+(s.description?' · '+s.description:'')+'</div></div>'
                  +'<div class="sp">'+fmt(s.price_pence)+'</div>'
                  +'</div>'
              }).join('')+'</div>'
            }
            html+='<button class="btn-primary" '+(S.svc?'':'disabled ')+' onclick="S.step=2;render()">Continue to date & time →</button>'
            app.innerHTML=html
          }

          function selSvc(s){S.svc=s;render()}

          function step2(){
            const now=new Date();now.setHours(0,0,0,0)
            const fd=new Date(S.mo.getFullYear(),S.mo.getMonth(),1).getDay()
            const dim=new Date(S.mo.getFullYear(),S.mo.getMonth()+1,0).getDate()
            let cal='<div class="calh"><span class="calm">'+MONTHS[S.mo.getMonth()]+' '+S.mo.getFullYear()+'</span>'
            cal+='<div class="calnav"><button class="calbtn" onclick="chMo(-1)">‹</button><button class="calbtn" onclick="chMo(1)">›</button></div></div>'
            cal+='<div class="cgrid">'+DAYS.map(d=>'<div class="cday-name">'+d+'</div>').join('')
            for(let i=0;i<fd;i++)cal+='<div class="cday empty"></div>'
            for(let d=1;d<=dim;d++){
              const dt=new Date(S.mo.getFullYear(),S.mo.getMonth(),d)
              const past=dt<now
              const dow=dt.getDay()
              const open=availability.some(a=>a.day_of_week===dow)
              const sel=S.date&&S.date.getDate()===d&&S.date.getMonth()===S.mo.getMonth()
              const tod=dt.toDateString()===now.toDateString()
              const cls='cday'+(past||!open?' past':'')+(sel?' sel':'')+(tod?' today':'')
              const click=(past||!open)?'':'onclick="selDate('+S.mo.getFullYear()+','+S.mo.getMonth()+','+d+')"'
              cal+='<div class="'+cls+'" '+click+'>'+d+'</div>'
            }
            cal+='</div>'
            let slots=''
            if(S.date){
              const dow=S.date.getDay()
              const av=availability.find(a=>a.day_of_week===dow)
              if(av){
                const[sh,sm]=av.start_time.split(':').map(Number)
                const[eh,em]=av.end_time.split(':').map(Number)
                const times=[]
                let cur=sh*60+sm
                while(cur+S.svc.duration_mins<=eh*60+em){
                  const h=Math.floor(cur/60),m=cur%60
                  const label=(h>12?h-12:h||12)+':'+(m<10?'0'+m:m)+' '+(h>=12?'pm':'am')
                  times.push({label,val:h+':'+m})
                  cur+=30
                }
                slots='<div class="tlabel">Available times — '+S.date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div>'
                slots+='<div class="sgrid">'+times.map(t=>'<button class="slotbtn'+(S.time===t.val?' sel':'')+'" onclick="selTime(\''+t.val+'\',\''+t.label+'\')">'+t.label+'</button>').join('')+'</div>'
              }
            }
            app.innerHTML=pips(2)
              +'<button class="back-btn" onclick="S.step=1;render()">← Back</button>'
              +'<div class="panel-title">Pick a date & time</div>'
              +'<div class="panel-sub">Choose when you\'d like to visit</div>'
              +cal+slots
              +'<button class="btn-primary" '+(S.date&&S.time?'':'disabled ')+' onclick="S.step=3;render()">Continue to your details →</button>'
          }

          function chMo(d){S.mo.setMonth(S.mo.getMonth()+d);S.date=null;S.time=null;render()}
          function selDate(y,m,d){S.date=new Date(y,m,d);S.time=null;render()}
          function selTime(v,l){S.time=v;S.timeLabel=l;render()}

          function step3(){
            app.innerHTML=pips(3)
              +'<button class="back-btn" onclick="S.step=2;render()">← Back</button>'
              +'<div class="panel-title">Your details</div>'
              +'<div class="panel-sub">Almost done</div>'
              +'<div class="frow"><div><label>First name</label><input id="fn" placeholder="Jane"></div><div><label>Last name</label><input id="ln" placeholder="Smith"></div></div>'
              +'<div class="ff"><label>Email</label><input type="email" id="em" placeholder="jane@example.com"></div>'
              +'<div class="ff"><label>Phone <span style="font-weight:400;text-transform:none;color:var(--gray-400)">optional</span></label><input type="tel" id="ph" placeholder="+44 7700 000000"></div>'
              +'<div class="ff"><label>Notes <span style="font-weight:400;text-transform:none;color:var(--gray-400)">optional</span></label><textarea id="nt" placeholder="Any requests or info..."></textarea></div>'
              +'<div class="sumbox">'
              +'<div class="sumrow"><span class="sumk">Service</span><span class="sumv">'+S.svc.name+'</span></div>'
              +'<div class="sumrow"><span class="sumk">Date</span><span class="sumv">'+S.date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</span></div>'
              +'<div class="sumrow"><span class="sumk">Time</span><span class="sumv">'+S.timeLabel+'</span></div>'
              +'<div class="sumdiv"></div>'
              +'<div class="sumrow"><span class="sumk">Total</span><span class="sumv sum-total">'+fmt(S.svc.price_pence)+'</span></div>'
              +'</div>'
              +'<button class="btn-primary" style="margin-top:14px" onclick="pay()">Confirm & pay '+fmt(S.svc.price_pence)+' →</button>'
              +'<p class="sec-note">🔒 Secured by Stripe · Free cancellation 24h before</p>'
          }

          async function pay(){
            const fn=document.getElementById('fn').value.trim()
            const em=document.getElementById('em').value.trim()
            if(!fn||!em){alert('Please enter your name and email');return}
            const btn=document.querySelector('.btn-primary')
            btn.disabled=true;btn.textContent='Processing...'
            try{
              const starts=new Date(S.date)
              const[h,m]=S.time.split(':').map(Number)
              starts.setHours(h,m,0,0)
              const res=await fetch('/api/bookings',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                  businessId:business.id,
                  serviceId:S.svc.id,
                  startsAt:starts.toISOString(),
                  guestName:fn+' '+(document.getElementById('ln').value.trim()),
                  guestEmail:em,
                  guestPhone:document.getElementById('ph').value.trim()||undefined,
                  notes:document.getElementById('nt').value.trim()||undefined,
                })
              })
              const data=await res.json()
              if(data.checkoutUrl)window.location.href=data.checkoutUrl
              else{alert(data.error||'Something went wrong');btn.disabled=false;btn.textContent='Confirm & pay →'}
            }catch(e){
              alert('Something went wrong. Please try again.')
              btn.disabled=false;btn.textContent='Confirm & pay →'
            }
          }

          render()
        `}}/>
      </body>
    </html>
  )
}
