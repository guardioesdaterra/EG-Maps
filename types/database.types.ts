export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      crews: {
        Row: {
          id: string
          name: string
          region: string
          email: string
          role: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          region: string
          email: string
          role?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          email?: string
          role?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grants: {
        Row: {
          id: string
          title: string
          description: string
          location_name: string
          latitude: number
          longitude: number
          submitted_by: string
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          location_name: string
          latitude: number
          longitude: number
          submitted_by: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          location_name?: string
          latitude?: number
          longitude?: number
          submitted_by?: string
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      grant_approvals: {
        Row: {
          id: string
          grant_id: string
          manager_id: string
          decision: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grant_id: string
          manager_id: string
          decision: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grant_id?: string
          manager_id?: string
          decision?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
