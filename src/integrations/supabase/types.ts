export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified: boolean
          id: string
          is_public: boolean
          last_login_attempt: string | null
          login_attempts: number
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          is_public?: boolean
          last_login_attempt?: string | null
          login_attempts?: number
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          is_public?: boolean
          last_login_attempt?: string | null
          login_attempts?: number
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          data: Json
          device_id: string | null
          id: string
          section: string
          updated_at: string
          user_id: string
          vault_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          data?: Json
          device_id?: string | null
          id?: string
          section: string
          updated_at?: string
          user_id: string
          vault_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          device_id?: string | null
          id?: string
          section?: string
          updated_at?: string
          user_id?: string
          vault_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "user_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vaults: {
        Row: {
          backup_config: Json | null
          created_at: string
          description: string | null
          encryption_key_hash: string | null
          graph_config: Json | null
          graph_data: Json
          id: string
          is_encrypted: boolean
          last_synced_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_config?: Json | null
          created_at?: string
          description?: string | null
          encryption_key_hash?: string | null
          graph_config?: Json | null
          graph_data?: Json
          id?: string
          is_encrypted?: boolean
          last_synced_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_config?: Json | null
          created_at?: string
          description?: string | null
          encryption_key_hash?: string | null
          graph_config?: Json | null
          graph_data?: Json
          id?: string
          is_encrypted?: boolean
          last_synced_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_backups: {
        Row: {
          created_at: string
          id: string
          links: Json
          nodes: Json
          reason: string | null
          user_id: string
          vault_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          links?: Json
          nodes?: Json
          reason?: string | null
          user_id: string
          vault_id: string
        }
        Update: {
          created_at?: string
          id?: string
          links?: Json
          nodes?: Json
          reason?: string | null
          user_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_backups_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "user_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_history: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          user_id: string
          vault_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot?: Json
          user_id: string
          vault_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          user_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_history_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "user_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
