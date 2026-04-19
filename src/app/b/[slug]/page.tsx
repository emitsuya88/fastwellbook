import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export default async function BookingPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient()

  // Load business by slug
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!business) notFound()

  // Load services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('price_pence', { ascending: true })

  // Load availability
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week', { ascending: true })

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const openDays = availability?.map(a => ({
    day: days[a.day_of_week],
    start: a.start_time,
    end: a.end_time
  })) ?? []

  const hoursText = openDays.length
    ? openDays.map(d => `${d.day}: ${d.start}–${d.end}`).join(', ')
    : 'Contact for hours'

  const businessData = JSON.stringify({ business, services, availability })

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Book — ${business.name}`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@1,9..144,200;1,9..144,300;1,9..144,400&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          :root{
            --teal:#0D9488;--teal-dark:#0F766E;--teal-deep:#134E4A;--teal-mid:#14B8A6;
            --teal-100:#CCFBF1;--teal-50:#F0FDFA;--teal-glow:rgba(13,148,136,0.18);
            --green:#16A34A;--white:#FFFFFF;--cream:#F5FAF8;
            --gray-200:#E5E7EB;--gray-400:#9CA3AF;--gray-500:#6B7280;--gray-600:#4B5563;--gray-800:#1F2937;
            --ink:#0D1F1A;--border:#E5E7EB;--gold:#F59E0B;
            --font:'Plus Jakarta Sans',system-ui,sans-serif;--serif:'Fraunces',Georgia,serif;
            --r:12px;--r-lg:18px;--r-xl:28px;
          }
          html{background:var(--cream);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
          body{min-height:100vh}
          .page{display:grid;grid-template-columns:320px 1fr;min-height:100vh}
          .left{background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
          .left-cover{height:6px;background:linear-gradient(90deg,var(--teal-dark),var(--teal-mid),var(--green))}
          .left-top{padding:28px 24px 20px;border-bottom:1px solid var(--border)}
          .biz-cat{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--teal);margin-bottom:8px}
          .biz-name{font-family:var(--serif);font-size:28px;font-weight:200;font-style:italic;color:var(--ink);line-height:1.2;margin-bottom:6px}
          .left-body{padding:20px 24px;flex:1;display:flex;flex-direction:column;gap:16px}
          .info-row{display:flex;gap:10px;align-items:flex-start}
          .info-icon{width:32px;height:32px;border-radius:9px;background:var(--teal-50);border:1.5px solid var(--teal-100);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
          .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--teal);margin-bottom:2px}
          .info-val{font-size:13px;color:var(--gray-600);font-weight:500;line-height:1.5}
          .powered{padding:14px 24px;border-top:1px solid var(--border);font-size:11px;color:var(--gray-400)}
          .powered a{color:var(--teal);font-weight:700;text-decoration:none}
          .right{padding:36px 44px;overflow-y:auto}
          .pips{display:flex;gap:5px;margin-bottom:32px}
          .pip{flex:1;height:4px;border-radius:4px;background:var(--gray-200);transition:background 0.3s}
          .pip.done{background:var(--teal)}
          .pip.active{background:var(--teal);opacity:0.5}
          .panel-title{font-family:var(--serif);font-size:26px;font-weight:200;font-style:italic;color:var(--ink);margin-bottom:6px}
          .panel-sub{font-size:14px;color:var(--gray-400);margin-bottom:24px}
          .slist{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
          .scard{border:1.5px solid var(--border);border-radius:var(--r-lg);padding:16px 18px;cursor:pointer;transition:all 0.2s;background:var(--white);display:flex;align-items:center;justify-content:space-between}
          .scard:hover{border-color:var(--teal-100);box-shadow:0 4px 16px rgba(0,0,0,0.07)}
          .scard.sel{border-color:var(--teal);background:var(--teal-50)}
          .sn{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px}
          .sd{font-size:12px;color:var(--gray-400)}
          .sp{font-family:var(--serif);font-size:20px;font-weight:200;font-style:italic;color:var(--teal)}
          .btn-primary{width:100%;padding:14px;background:var(--teal);color:white;border:none;border-radius:var(--r);font-size:15px;font-weight:800;font-family:var(--font);cursor:pointer;transition:all 0.2s;box-shadow:0 6px 20px var(--teal-glow)}
          .btn-primary:hover{background:var(--teal-dark);transform:translateY(-1px)}
          .btn-primary:disabled{opacity:0.4;cursor:not-allowed;transform:none}
          .back-btn{background:none;border:none;color:var(--gray-400);font-size:13px;cursor:pointer;font-family:var(--font);padding:0 0 20px;font-weight:600}
          .calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
          .calm{font-family:var(--serif);font-size:18px;font-style:italic;font-weight:200;color:var(--ink)}
          .calnav{display:flex;gap:6px}
          .calbtn{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
          .calbtn:hover{background:var(--teal);color:white;border-color:var(--teal)}
          .cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:20px}
          .cday-name{text-align:center;font-size:10px;font-weight:700;color:var(--gray-400);padding:6px 0;text-transform:uppercase}
          .cday{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;border-radius:9px;cursor:pointer;border:1.5px solid transparent;transition:all 0.15s;color:var(--ink);font-weight:500}
          .cday:hover:not(.empty):not(.past){background:var(--teal-50);border-color:var(--teal-100)}
          .cday.sel{background:var(--teal)!important;color:white!important;border-color:var(--teal)!important}
          .cday.today{border-color:var(--gold);font-weight:700}
          .cday.past{color:var(--gray-200);cursor:default}
          .cday.empty{cursor:default}
          .tlabel{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-400);margin-bottom:10px}
          .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:20px}
          .slotbtn{padding:9px 4px;border:1.5px solid var(--border);border-radius:9px;background:var(--white);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);color:var(--ink);transition:all 0.15s;text-align:center}
          .slotbtn:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-50)}
          .slotbtn.sel{background:var(--teal);color:white;border-color:var(--teal)}
          .ff{margin-bottom:12px}
          .frow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
          label{display:block;font-size:11px;font-weight:700;color:var(--gray-600);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.07em}
          input,textarea{width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:var(--r);font-size:14px;font-family:var(--font);color:var(--ink);background:var(--white);outline:none;transition:all 0.15s;font-weight:500}
          input:focus,textarea:focus{border-color:var(--teal);box-shadow:0 0 0 4px var(--teal-50)}
          input::placeholder,textarea::placeholder{color:var(--gray-400);font-weight:400}
          textarea{resize:none;height:72px;line-height:1.5}
          .sumbox{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:16px;margin:16px 0 0}
          .sumrow{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px}
          .sumk{color:var(--gray-400)}
          .sumv{font-weight:700}
          .sumdiv{height:1px;background:var(--border);margin:10px 0}
          .sum-total{font-family:var(--serif);font-size:20px;font-style:italic;font-weight:200;color:var(--teal)}
          .sec-note{text-align:center;font-size:11px;color:var(--gray-400);margin-top:8px}
          .conf-wrap{text-align:center;padding:20px 0 32px}
          .conf-icon{width:64px;height:64px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 20px;color:var(--green)}
          .conf-title{font-family:var(--serif);font-size:30px;font-style:italic;font-weight:200;color:var(--ink);margin-bottom:8px}
          .conf-sub{font-size:14px;color:var(--gray-400);margin-bottom:24px}
          .conf-card{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:18px;text-align:left}
          @media(max-width:768px){.page{grid-template-columns:1fr}.left{position:static;height:auto}.right{padding:24px 18px}.sgrid{grid-template-columns:repeat(3,1fr)}.frow{grid-template-columns:1fr}}
        `}</style>
      </head>
      <body>
        <div className="page">
          <aside className="left">
            <div className="left-cover"></div>
            <div className="left-top">
              <div className="biz-cat">{business.category === 'salon_spa' ? 'Salon & Spa' : 'Fitness & Yoga'}</div>
              <div className="biz-name">{business.name}</div>
              {business.description && <div style={{fontSize:'13px',color:'var(--gray-500)',lineHeight:'1.6',marginTop:'6px'}}>{business.description}</div>}
            </div>
            <div className="left-body">
              {business.address && (
                <div className="info-row">
                  <div className="info-icon">📍</div>
                  <div><div className="info-label">Location</div><div className="info-val">{business.address}</div></div>
                </div>
              )}
              {openDays.length > 0 && (
                <div className="info-row">
                  <div className="info-icon">🕐</div>
                  <div><div className="info-label">Hours</div><div className="info-val">{openDays.map(d=>`${d.day.slice(0,3)}: ${d.start}–${d.end}`).join('\n')}</div></div>
                </div>
              )}
              {business.phone && (
                <div className="info-row">
                  <div className="info-icon">📞</div>
                  <div><div className="info-label">Contact</div><div className="info-val">{business.phone}</div></div>
                </div>
              )}
              {business.email && (
                <div className="info-row">
                  <div className="info-icon">✉️</div>
                  <div><div className="info-label">Email</div><div className="info-val">{business.email}</div></div>
                </div>
              )}
            </div>
            <div className="powered">Booking powered by <a href="/">FastWellBook</a></div>
          </aside>

          <main className="right">
            <div id="booking-app" data-business={businessData}></div>
          </main>
        </div>

        <script dangerouslySetInnerHTML={{__html: `
          const raw = document.getElementById('booking-app').dataset.business
          const {business, services, availability} = JSON.parse(raw)
          const app = document.getElementById('booking-app')
          const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
          const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
          let S = {step:1, svc:null, date:null, time:null, mo:new Date()}
          S.mo.setDate(1)

          function fmt(p){return '£'+(p/100).toFixed(2)}

          function render(){
            if(S.step===1) renderStep1()
            else if(S.step===2) renderStep2()
            else if(S.step===3) renderStep3()
            else renderConf()
          }

          function pips(cur){
            return '<div class="pips">'+[1,2,3].map(i=>'<div class="pip '+(i<cur?'done':i===cur?'active':'')+'"></div>').join('')+'</div>'
          }

          function renderStep1(){
            app.innerHTML = pips(1)+
              '<div class="panel-title">Choose a service</div>'+
              '<div class="panel-sub">Select what you\'d like to book</div>'+
              '<div class="slist">'+
              (services||[]).map(s=>'<div class="scard'+(S.svc&&S.svc.id===s.id?' sel':'')+'" onclick="selSvc('+JSON.stringify(s).replace(/"/g,'&quot;')+')">'+'<div><div class="sn">'+s.name+'</div><div class="sd">'+s.duration_mins+' min'+(s.description?' · '+s.description:'')+'</div></div><div class="sp">'+fmt(s.price_pence)+'</div></div>').join('')+
              '</div>'+
              '<button class="btn-primary" '+(S.svc?'':'disabled')+'onclick="S.step=2;render()">Continue to date & time →</button>'
          }

          function selSvc(s){S.svc=s;render()}

          function renderStep2(){
            const now = new Date(); now.setHours(0,0,0,0)
            const fd = new Date(S.mo.getFullYear(),S.mo.getMonth(),1).getDay()
            const dim = new Date(S.mo.getFullYear(),S.mo.getMonth()+1,0).getDate()
            let cal = '<div class="calh"><span class="calm">'+months[S.mo.getMonth()]+' '+S.mo.getFullYear()+'</span><div class="calnav"><button class="calbtn" onclick="chMo(-1)">‹</button><button class="calbtn" onclick="chMo(1)">›</button></div></div>'
            cal += '<div class="cgrid">'+days.map(d=>'<div class="cday-name">'+d+'</div>').join('')
            for(let i=0;i<fd;i++) cal+='<div class="cday empty"></div>'
            for(let d=1;d<=dim;d++){
              const dt=new Date(S.mo.getFullYear(),S.mo.getMonth(),d)
              const past=dt<now
              const dow=dt.getDay()
              const avail=availability&&availability.some(a=>a.day_of_week===dow)
              const sel=S.date&&S.date.getDate()===d&&S.date.getMonth()===S.mo.getMonth()
              const tod=dt.toDateString()===now.toDateString()
              cal+='<div class="cday'+(past?' past':!avail?' past':'')+(sel?' sel':'')+(tod?' today':'')+'" onclick="'+(past||!avail?'':'selDate('+S.mo.getFullYear()+','+S.mo.getMonth()+','+d+')')+'">'+(d)+'</div>'
            }
            cal+='</div>'
            let slots=''
            if(S.date){
              const dow=S.date.getDay()
              const av=availability&&availability.find(a=>a.day_of_week===dow)
              if(av){
                const [sh,sm]=av.start_time.split(':').map(Number)
                const [eh,em]=av.end_time.split(':').map(Number)
                const times=[]
                let cur=sh*60+sm
                const end=eh*60+em
                while(cur+S.svc.duration_mins<=end){
                  const h=Math.floor(cur/60),m=cur%60
                  const label=(h>12?h-12:h||12)+':'+(m<10?'0'+m:m)+' '+(h>=12?'pm':'am')
                  times.push({label,val:h+':'+m})
                  cur+=30
                }
                slots='<div class="tlabel">Available times for '+S.date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div>'
                slots+='<div class="sgrid">'+times.map(t=>'<button class="slotbtn'+(S.time===t.val?' sel':'')+'" onclick="selTime(\''+t.val+'\',\''+t.label+'\')">'+t.label+'</button>').join('')+'</div>'
              }
            }
            app.innerHTML=pips(2)+
              '<button class="back-btn" onclick="S.step=1;render()">← Back</button>'+
              '<div class="panel-title">Pick a date & time</div>'+
              '<div class="panel-sub">Choose when you\'d like to come in</div>'+
              cal+slots+
              '<button class="btn-primary" '+(S.date&&S.time?'':'disabled')+'onclick="S.step=3;render()">Continue to your details →</button>'
          }

          function chMo(d){S.mo.setMonth(S.mo.getMonth()+d);S.date=null;S.time=null;render()}
          function selDate(y,m,d){S.date=new Date(y,m,d);S.time=null;render()}
          function selTime(v,l){S.time=v;S.timeLabel=l;render()}

          function renderStep3(){
            app.innerHTML=pips(3)+
              '<button class="back-btn" onclick="S.step=2;render()">← Back</button>'+
              '<div class="panel-title">Your details</div>'+
              '<div class="panel-sub">Almost done</div>'+
              '<div class="frow"><div><label>First name</label><input type="text" id="fname" placeholder="Jane"></div><div><label>Last name</label><input type="text" id="lname" placeholder="Smith"></div></div>'+
              '<div class="ff"><label>Email</label><input type="email" id="email" placeholder="jane@example.com"></div>'+
              '<div class="ff"><label>Phone <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--gray-400)">optional</span></label><input type="tel" id="phone" placeholder="+44 7700 000000"></div>'+
              '<div class="ff"><label>Notes <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--gray-400)">optional</span></label><textarea id="notes" placeholder="Any preferences or info..."></textarea></div>'+
              '<div class="sumbox">'+
                '<div class="sumrow"><span class="sumk">Service</span><span class="sumv">'+S.svc.name+'</span></div>'+
                '<div class="sumrow"><span class="sumk">Date</span><span class="sumv">'+S.date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</span></div>'+
                '<div class="sumrow"><span class="sumk">Time</span><span class="sumv">'+S.timeLabel+'</span></div>'+
                '<div class="sumdiv"></div>'+
                '<div class="sumrow"><span class="sumk">Total</span><span class="sumv sum-total">'+fmt(S.svc.price_pence)+'</span></div>'+
              '</div>'+
              '<button class="btn-primary" style="margin-top:16px" onclick="submit()">Confirm & pay →</button>'+
              '<p class="sec-note">🔒 Secured by Stripe · Free cancellation 24h before</p>'
          }

          async function submit(){
            const fname=document.getElementById('fname').value.trim()
            const email=document.getElementById('email').value.trim()
            if(!fname||!email){alert('Please enter your name and email');return}
            const btn=document.querySelector('.btn-primary')
            btn.disabled=true;btn.textContent='Processing...'
            try{
              const starts=new Date(S.date)
              const [h,m]=S.time.split(':').map(Number)
              starts.setHours(h,m,0,0)
              const res=await fetch('/api/bookings',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                  businessId:business.id,
                  serviceId:S.svc.id,
                  startsAt:starts.toISOString(),
                  guestName:fname+' '+(document.getElementById('lname').value.trim()),
                  guestEmail:email,
                  guestPhone:document.getElementById('phone').value.trim()||undefined,
                  notes:document.getElementById('notes').value.trim()||undefined,
                })
              })
              const data=await res.json()
              if(data.checkoutUrl){
                window.location.href=data.checkoutUrl
              } else {
                alert(data.error||'Something went wrong')
                btn.disabled=false;btn.textContent='Confirm & pay →'
              }
            }catch(e){
              alert('Something went wrong. Please try again.')
              btn.disabled=false;btn.textContent='Confirm & pay →'
            }
          }

          render()
        `}} />
      </body>
    </html>
  )
}
