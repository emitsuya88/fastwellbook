export const dynamic = 'force-dynamic'

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
  const hoursLines = (availability ?? []).map(a =>
    `${dayNames[a.day_of_week]}: ${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}`
  )

  const jsonData = JSON.stringify({ business, services: services ?? [], availability: availability ?? [] })

  return (
    <div>
      <script id="biz-data" type="application/json" dangerouslySetInnerHTML={{__html: jsonData}} />
      <div className="biz-panel">
        <div className="biz-bar"></div>
        <div className="biz-top">
          <div className="biz-cat">{business.category === 'salon_spa' ? 'Salon & Spa' : 'Fitness & Yoga'}</div>
          <div className="biz-name">{business.name}</div>
        </div>
        <div className="biz-body">
          {business.address && (
            <div className="info-row">
              <span className="info-icon">📍</span>
              <div><div className="info-label">Location</div><div className="info-val">{business.address}</div></div>
            </div>
          )}
          {hoursLines.length > 0 && (
            <div className="info-row">
              <span className="info-icon">🕐</span>
              <div>
                <div className="info-label">Hours</div>
                {hoursLines.map((l, i) => <div key={i} className="info-val">{l}</div>)}
              </div>
            </div>
          )}
          {business.phone && (
            <div className="info-row">
              <span className="info-icon">📞</span>
              <div><div className="info-label">Phone</div><div className="info-val">{business.phone}</div></div>
            </div>
          )}
          {business.email && (
            <div className="info-row">
              <span className="info-icon">✉️</span>
              <div><div className="info-label">Email</div><div className="info-val">{business.email}</div></div>
            </div>
          )}
        </div>
        <div className="powered">Powered by <a href="/">FastWellBook</a></div>
      </div>
      <div className="booking-panel" id="app">
        <div className="loading">Loading services...</div>
      </div>
    </div>
  )
}
