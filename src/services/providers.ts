// Provider configuration service
// Fetches enabled providers from the database

import { supabase } from '../lib/supabase'

export interface ApiProvider {
  id: string
  name: string
  display_name: string
  provider_type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'multi'
  base_url: string
  is_enabled: boolean
  models: Array<{
    id: string
    name: string
    type?: string
    default?: boolean
  }>
  capabilities: string[]
  rate_limits?: {
    requests_per_minute?: number
    tokens_per_minute?: number
  }
  created_at: string
  updated_at: string
}

/**
 * Fetch all enabled API providers from the database
 */
export async function getEnabledProviders(): Promise<ApiProvider[]> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .eq('is_enabled', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch providers:', error)
    return []
  }

  return data || []
}

/**
 * Fetch a specific provider by name
 */
export async function getProvider(name: string): Promise<ApiProvider | null> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .eq('name', name)
    .eq('is_enabled', true)
    .single()

  if (error) {
    console.error(`Failed to fetch provider ${name}:`, error)
    return null
  }

  return data
}

/**
 * Check if a specific provider is enabled
 */
export async function isProviderEnabled(name: string): Promise<boolean> {
  const provider = await getProvider(name)
  return provider !== null
}

/**
 * Get providers by capability
 */
export async function getProvidersByCapability(capability: string): Promise<ApiProvider[]> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .eq('is_enabled', true)
    .contains('capabilities', [capability])

  if (error) {
    console.error(`Failed to fetch providers with capability ${capability}:`, error)
    return []
  }

  return data || []
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: ApiProvider): string | null {
  const defaultModel = provider.models.find(m => m.default)
  return defaultModel?.id || provider.models[0]?.id || null
}
