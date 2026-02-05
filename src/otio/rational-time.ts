/**
 * RationalTime - Frame-accurate time utilities
 *
 * All time values are stored as frame counts at a given rate.
 * This avoids floating-point precision issues common with seconds-based time.
 */

import type { RationalTime, TimeRange } from './types'

// Default frame rate for the project
export const DEFAULT_RATE = 30

// ============================================
// CREATION
// ============================================

/**
 * Create a RationalTime from frame count
 */
export function fromFrames(frames: number, rate: number = DEFAULT_RATE): RationalTime {
  return { value: Math.round(frames), rate }
}

/**
 * Create a RationalTime from seconds
 */
export function fromSeconds(seconds: number, rate: number = DEFAULT_RATE): RationalTime {
  return { value: Math.round(seconds * rate), rate }
}

/**
 * Create a zero-duration RationalTime
 */
export function zero(rate: number = DEFAULT_RATE): RationalTime {
  return { value: 0, rate }
}

/**
 * Create a TimeRange from start and duration in seconds
 */
export function rangeFromSeconds(
  startSeconds: number,
  durationSeconds: number,
  rate: number = DEFAULT_RATE
): TimeRange {
  return {
    startTime: fromSeconds(startSeconds, rate),
    duration: fromSeconds(durationSeconds, rate),
  }
}

/**
 * Create a TimeRange from start and end in seconds
 */
export function rangeFromStartEnd(
  startSeconds: number,
  endSeconds: number,
  rate: number = DEFAULT_RATE
): TimeRange {
  return {
    startTime: fromSeconds(startSeconds, rate),
    duration: fromSeconds(endSeconds - startSeconds, rate),
  }
}

// ============================================
// CONVERSION
// ============================================

/**
 * Convert RationalTime to seconds (floating point)
 */
export function toSeconds(rt: RationalTime): number {
  return rt.value / rt.rate
}

/**
 * Convert RationalTime to frame count at the native rate
 */
export function toFrames(rt: RationalTime): number {
  return rt.value
}

/**
 * Rescale RationalTime to a different frame rate
 */
export function rescale(rt: RationalTime, newRate: number): RationalTime {
  if (rt.rate === newRate) return rt
  const seconds = rt.value / rt.rate
  return { value: Math.round(seconds * newRate), rate: newRate }
}

/**
 * Get the end time of a TimeRange (startTime + duration)
 */
export function rangeEndTime(range: TimeRange): RationalTime {
  // Ensure same rate before adding
  const dur = rescale(range.duration, range.startTime.rate)
  return { value: range.startTime.value + dur.value, rate: range.startTime.rate }
}

/**
 * Get the duration of a TimeRange as seconds
 */
export function rangeDurationSeconds(range: TimeRange): number {
  return toSeconds(range.duration)
}

// ============================================
// ARITHMETIC
// ============================================

/**
 * Add two RationalTimes (normalizes to first operand's rate)
 */
export function add(a: RationalTime, b: RationalTime): RationalTime {
  const bRescaled = rescale(b, a.rate)
  return { value: a.value + bRescaled.value, rate: a.rate }
}

/**
 * Subtract two RationalTimes (a - b, normalizes to first operand's rate)
 */
export function subtract(a: RationalTime, b: RationalTime): RationalTime {
  const bRescaled = rescale(b, a.rate)
  return { value: a.value - bRescaled.value, rate: a.rate }
}

/**
 * Multiply RationalTime by a scalar
 */
export function multiply(rt: RationalTime, scalar: number): RationalTime {
  return { value: Math.round(rt.value * scalar), rate: rt.rate }
}

/**
 * Negate a RationalTime
 */
export function negate(rt: RationalTime): RationalTime {
  return { value: -rt.value, rate: rt.rate }
}

/**
 * Get absolute value of RationalTime
 */
export function abs(rt: RationalTime): RationalTime {
  return { value: Math.abs(rt.value), rate: rt.rate }
}

// ============================================
// COMPARISON
// ============================================

/**
 * Compare two RationalTimes
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compare(a: RationalTime, b: RationalTime): -1 | 0 | 1 {
  const aSeconds = toSeconds(a)
  const bSeconds = toSeconds(b)
  if (aSeconds < bSeconds) return -1
  if (aSeconds > bSeconds) return 1
  return 0
}

export function isEqual(a: RationalTime, b: RationalTime): boolean {
  return compare(a, b) === 0
}

export function isLessThan(a: RationalTime, b: RationalTime): boolean {
  return compare(a, b) < 0
}

export function isGreaterThan(a: RationalTime, b: RationalTime): boolean {
  return compare(a, b) > 0
}

export function isLessThanOrEqual(a: RationalTime, b: RationalTime): boolean {
  return compare(a, b) <= 0
}

export function isGreaterThanOrEqual(a: RationalTime, b: RationalTime): boolean {
  return compare(a, b) >= 0
}

/**
 * Get minimum of two RationalTimes
 */
export function min(a: RationalTime, b: RationalTime): RationalTime {
  return isLessThan(a, b) ? a : b
}

/**
 * Get maximum of two RationalTimes
 */
export function max(a: RationalTime, b: RationalTime): RationalTime {
  return isGreaterThan(a, b) ? a : b
}

/**
 * Clamp RationalTime to a range
 */
export function clamp(rt: RationalTime, minVal: RationalTime, maxVal: RationalTime): RationalTime {
  return max(minVal, min(maxVal, rt))
}

// ============================================
// RANGE OPERATIONS
// ============================================

/**
 * Check if a time falls within a range (inclusive of start, exclusive of end)
 */
export function isTimeInRange(time: RationalTime, range: TimeRange): boolean {
  const end = rangeEndTime(range)
  return isGreaterThanOrEqual(time, range.startTime) && isLessThan(time, end)
}

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aEnd = rangeEndTime(a)
  const bEnd = rangeEndTime(b)
  return isLessThan(a.startTime, bEnd) && isLessThan(b.startTime, aEnd)
}

/**
 * Check if range A contains range B entirely
 */
export function rangeContains(outer: TimeRange, inner: TimeRange): boolean {
  const outerEnd = rangeEndTime(outer)
  const innerEnd = rangeEndTime(inner)
  return isLessThanOrEqual(outer.startTime, inner.startTime) &&
         isGreaterThanOrEqual(outerEnd, innerEnd)
}

/**
 * Get the intersection of two ranges (or null if no overlap)
 */
export function rangeIntersection(a: TimeRange, b: TimeRange): TimeRange | null {
  if (!rangesOverlap(a, b)) return null

  const start = max(a.startTime, b.startTime)
  const aEnd = rangeEndTime(a)
  const bEnd = rangeEndTime(b)
  const end = min(aEnd, bEnd)

  return {
    startTime: start,
    duration: subtract(end, start),
  }
}

/**
 * Extend a range to include another time point
 */
export function rangeExtendedBy(range: TimeRange, time: RationalTime): TimeRange {
  const end = rangeEndTime(range)

  if (isLessThan(time, range.startTime)) {
    // Extend start backwards
    return {
      startTime: time,
      duration: subtract(end, time),
    }
  } else if (isGreaterThan(time, end)) {
    // Extend end forwards
    return {
      startTime: range.startTime,
      duration: subtract(time, range.startTime),
    }
  }

  // Time already within range
  return range
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format RationalTime as timecode string (HH:MM:SS:FF or HH:MM:SS.mmm)
 */
export function toTimecode(rt: RationalTime, showFrames: boolean = false): string {
  const totalSeconds = toSeconds(rt)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  if (showFrames) {
    const frames = rt.value % rt.rate
    const ff = frames.toString().padStart(2, '0')
    return `${hh}:${mm}:${ss}:${ff}`
  } else {
    const millis = Math.round((totalSeconds % 1) * 1000)
    const mmm = millis.toString().padStart(3, '0')
    return `${hh}:${mm}:${ss}.${mmm}`
  }
}

/**
 * Format as MLT-compatible timecode (HH:MM:SS.mmm)
 */
export function toMLTTimecode(rt: RationalTime): string {
  return toTimecode(rt, false)
}

/**
 * Parse timecode string to RationalTime
 * Supports: "HH:MM:SS:FF", "HH:MM:SS.mmm", "SS.mmm", "SS"
 */
export function fromTimecode(tc: string, rate: number = DEFAULT_RATE): RationalTime {
  // Try HH:MM:SS:FF format
  const frameMatch = tc.match(/^(\d+):(\d+):(\d+):(\d+)$/)
  if (frameMatch) {
    const [, h, m, s, f] = frameMatch.map(Number)
    const totalFrames = ((h * 3600 + m * 60 + s) * rate) + f
    return { value: totalFrames, rate }
  }

  // Try HH:MM:SS.mmm format
  const msMatch = tc.match(/^(\d+):(\d+):(\d+)\.(\d+)$/)
  if (msMatch) {
    const [, h, m, s, ms] = msMatch
    const seconds = Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
    return fromSeconds(seconds, rate)
  }

  // Try SS.mmm or just SS
  const seconds = parseFloat(tc)
  if (!isNaN(seconds)) {
    return fromSeconds(seconds, rate)
  }

  throw new Error(`Invalid timecode format: ${tc}`)
}

/**
 * Format as human-readable duration (e.g., "1m 30s", "45s")
 */
export function toHumanDuration(rt: RationalTime): string {
  const totalSeconds = Math.round(toSeconds(rt))

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins > 0) {
    return seconds > 0 ? `${hours}h ${mins}m ${seconds}s` : `${hours}h ${mins}m`
  }

  return `${hours}h`
}
