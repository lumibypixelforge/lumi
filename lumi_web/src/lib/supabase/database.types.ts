export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string
          role: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          admin_id: string
          created_at: string
          customer_id: string
          id: string
          note: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          customer_id: string
          id?: string
          note: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          next_action_at: string | null
          status: Database["public"]["Enums"]["follow_up_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          next_action_at?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          next_action_at?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          preorder_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          preorder_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          preorder_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_preorder_id_fkey"
            columns: ["preorder_id"]
            isOneToOne: false
            referencedRelation: "preorders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          method: string | null
          preorder_id: string
          raw_payload: Json | null
          signature_verified: boolean
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          method?: string | null
          preorder_id: string
          raw_payload?: Json | null
          signature_verified?: boolean
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          method?: string | null
          preorder_id?: string
          raw_payload?: Json | null
          signature_verified?: boolean
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_preorder_id_fkey"
            columns: ["preorder_id"]
            isOneToOne: false
            referencedRelation: "preorders"
            referencedColumns: ["id"]
          },
        ]
      }
      preorders: {
        Row: {
          created_at: string
          currency: string
          deposit_paise: number
          gst_number: string | null
          id: string
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          quantity: number
          shipping_address: Json
          terms_accepted_at: string | null
          total_paise: number
          unit_price_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deposit_paise: number
          gst_number?: string | null
          id?: string
          order_number: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quantity?: number
          shipping_address?: Json
          terms_accepted_at?: string | null
          total_paise: number
          unit_price_paise: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          deposit_paise?: number
          gst_number?: string | null
          id?: string
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          quantity?: number
          shipping_address?: Json
          terms_accepted_at?: string | null
          total_paise?: number
          unit_price_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preorders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consent_text_version: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          signup_source: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          consent_text_version?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signup_source?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          consent_text_version?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signup_source?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          payload: Json
          processed_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          payload?: Json
          processed_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          payload?: Json
          processed_at?: string | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_segments: {
        Row: {
          created_at: string | null
          email: string | null
          engagement_score: number | null
          full_name: string | null
          id: string | null
          last_login_at: string | null
          marketing_consent: boolean | null
          marketing_consent_at: string | null
          paid_order_count: number | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          segment: string | null
          total_order_count: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          engagement_score?: never
          full_name?: string | null
          id?: string | null
          last_login_at?: string | null
          marketing_consent?: boolean | null
          marketing_consent_at?: string | null
          paid_order_count?: never
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          segment?: never
          total_order_count?: never
        }
        Update: {
          created_at?: string | null
          email?: string | null
          engagement_score?: never
          full_name?: string | null
          id?: string | null
          last_login_at?: string | null
          marketing_consent?: boolean | null
          marketing_consent_at?: string | null
          paid_order_count?: never
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          segment?: never
          total_order_count?: never
        }
        Relationships: []
      }
    }
    Enums: {
      follow_up_status: "new" | "contacted" | "interested" | "not_interested"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "abandoned"
      payment_status:
        | "created"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      user_role: "customer" | "admin" | "staff"
    }
    Functions: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
