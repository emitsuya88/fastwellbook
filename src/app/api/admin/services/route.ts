import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fastwellbook2024'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('x-admin-password')
  return auth === ADMIN_PASSWORD
}

// GET — list all services for a business
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: business } = await supabase.from('businesses').select('id,name,slug').eq('slug', slug).single()
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  const { data: services } = await supabase.from('services').select('*').eq('business_id', business.id).order('price_pence');
  const { data: availability } = await supabase.from('availability').select('*').eq('business_id', business.id).order('day_of_week')
  return NextResponse.json({ business, services, availability })
}

// POST — add a service
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { business_id, name, description, duration_mins, price_pence } = body
  if (!business_id || !name || !duration_mins || !price_pence) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('services').insert({ business_id, name, description: description || null, duration_mins: parseInt(duration_mins), price_pence: parseInt(price_pence), active: true }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove a service
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createAdminClient()
  await supabase.from('services').delete().eq('id', id)
  return NextResponse.json({ deleted: true })
}
