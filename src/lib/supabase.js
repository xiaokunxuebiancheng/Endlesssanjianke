import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bezzoulxlfjsnzmgongw.supabase.co'
const supabaseAnonKey = 'sb_publishable_hrPc1GoCK8lVFm2qFeJe0Q_rwkEfUFk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: generate a simple browser fingerprint for guest likes
export function getGuestFingerprint() {
  let fp = localStorage.getItem('guest_fp')
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('guest_fp', fp)
  }
  return fp
}
