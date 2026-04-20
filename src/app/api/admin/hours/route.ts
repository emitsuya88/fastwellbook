import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fastwellbook2024'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { business_id, availability } = await req.json()
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  const supabase = createAdminClient()
  // Delete existing availability
  await supabase.from('availability').delete().eq('business_id', business_id)
  // Insert new
  if (availability && availability.length > 0) {
    const { error } = await supabase.from('availability').insert(
      availability.map((a: any) => ({
        business_id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ saved: true })
}
