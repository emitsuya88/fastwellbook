// src/lib/availability.ts
// Checks if a slot is available given weekly availability + existing bookings

import { addMinutes, getDay, format, parseISO } from 'date-fns'
import type { Availability, Booking } from '@/types'

interface SlotInput {
  startsAt: Date
  durationMins: number
}

/**
 * Returns true if the proposed slot fits within business availability
 * AND doesn't overlap any existing confirmed/pending booking.
 */
export function isSlotAvailable(
  slot: SlotInput,
  availability: Availability[],
  existingBookings: Booking[]
): boolean {
  const endsAt = addMinutes(slot.startsAt, slot.durationMins)
  const dayOfWeek = getDay(slot.startsAt)  // 0=Sun
  const startTime = format(slot.startsAt, 'HH:mm')
  const endTime = format(endsAt, 'HH:mm')

  // 1. Check day is within business availability
  const daySlots = availability.filter(a => a.day_of_week === dayOfWeek)
  const fitsAvailability = daySlots.some(
    a => a.start_time <= startTime && a.end_time >= endTime
  )
  if (!fitsAvailability) return false

  // 2. Check no overlap with existing bookings
  const hasConflict = existingBookings
    .filter(b => b.status !== 'cancelled' && b.status !== 'refunded')
    .some(b => {
      const bStart = parseISO(b.starts_at)
      const bEnd = parseISO(b.ends_at)
      // Overlap if: proposed start < existing end AND proposed end > existing start
      return slot.startsAt < bEnd && endsAt > bStart
    })

  return !hasConflict
}

/**
 * Generate all available 30-min slot starts for a given date.
 * Returns array of ISO strings.
 */
export function generateSlotsForDate(
  date: Date,
  durationMins: number,
  availability: Availability[],
  existingBookings: Booking[]
): string[] {
  const dayOfWeek = getDay(date)
  const daySlots = availability.filter(a => a.day_of_week === dayOfWeek)
  const slots: string[] = []

  for (const avail of daySlots) {
    const [startHour, startMin] = avail.start_time.split(':').map(Number)
    const [endHour, endMin] = avail.end_time.split(':').map(Number)

    let current = new Date(date)
    current.setHours(startHour, startMin, 0, 0)

    const end = new Date(date)
    end.setHours(endHour, endMin, 0, 0)

    while (addMinutes(current, durationMins) <= end) {
      if (isSlotAvailable({ startsAt: current, durationMins }, availability, existingBookings)) {
        slots.push(current.toISOString())
      }
      current = addMinutes(current, 30)  // 30-min increments
    }
  }

  return slots
}
