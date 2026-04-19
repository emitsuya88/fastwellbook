import { redirect } from 'next/navigation'

export default function BookingPage({ params }: { params: { slug: string } }) {
  redirect(`/api/page/${params.slug}`)
}
