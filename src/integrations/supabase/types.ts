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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_name: string
          created_at: string
          details: string | null
          entity_ref: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_name: string
          created_at?: string
          details?: string | null
          entity_ref?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_name?: string
          created_at?: string
          details?: string | null
          entity_ref?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      bank_records: {
        Row: {
          amount: number
          bank_name: string | null
          id: string
          member_id: string | null
          reference: string | null
          transacted_at: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          id?: string
          member_id?: string | null
          reference?: string | null
          transacted_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          id?: string
          member_id?: string | null
          reference?: string | null
          transacted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          collector_name: string | null
          contributed_at: string
          created_at: string
          group_id: string
          id: string
          member_id: string
          reference: string | null
          source: string
        }
        Insert: {
          amount: number
          collector_name?: string | null
          contributed_at?: string
          created_at?: string
          group_id: string
          id?: string
          member_id: string
          reference?: string | null
          source?: string
        }
        Update: {
          amount?: number
          collector_name?: string | null
          contributed_at?: string
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string
          reference?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_code: string
          alert_type: string
          confidence: number
          contributing_factors: Json
          contribution_id: string | null
          created_at: string
          explanation: string
          group_id: string | null
          id: string
          member_id: string | null
          risk_level: string
          risk_score: number
          status: string
        }
        Insert: {
          alert_code: string
          alert_type: string
          confidence?: number
          contributing_factors?: Json
          contribution_id?: string | null
          created_at?: string
          explanation: string
          group_id?: string | null
          id?: string
          member_id?: string | null
          risk_level?: string
          risk_score?: number
          status?: string
        }
        Update: {
          alert_code?: string
          alert_type?: string
          confidence?: number
          contributing_factors?: Json
          contribution_id?: string | null
          created_at?: string
          explanation?: string
          group_id?: string | null
          id?: string
          member_id?: string | null
          risk_level?: string
          risk_score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          member_id: string
          payout_position: number | null
        }
        Insert: {
          group_id: string
          id?: string
          member_id: string
          payout_position?: number | null
        }
        Update: {
          group_id?: string
          id?: string
          member_id?: string
          payout_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          contribution_amount: number
          created_at: string
          cycle_length_weeks: number
          id: string
          leader_name: string | null
          location: string | null
          name: string
          status: string
        }
        Insert: {
          contribution_amount?: number
          created_at?: string
          cycle_length_weeks?: number
          id?: string
          leader_name?: string | null
          location?: string | null
          name: string
          status?: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          cycle_length_weeks?: number
          id?: string
          leader_name?: string | null
          location?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          full_name: string
          id: string
          joined_at: string
          national_id: string | null
          phone: string | null
          risk_score: number
          status: string
        }
        Insert: {
          full_name: string
          id?: string
          joined_at?: string
          national_id?: string | null
          phone?: string | null
          risk_score?: number
          status?: string
        }
        Update: {
          full_name?: string
          id?: string
          joined_at?: string
          national_id?: string | null
          phone?: string | null
          risk_score?: number
          status?: string
        }
        Relationships: []
      }
      mobile_money_records: {
        Row: {
          amount: number
          id: string
          member_id: string | null
          provider: string | null
          reference: string | null
          transacted_at: string
        }
        Insert: {
          amount: number
          id?: string
          member_id?: string | null
          provider?: string | null
          reference?: string | null
          transacted_at?: string
        }
        Update: {
          amount?: number
          id?: string
          member_id?: string | null
          provider?: string | null
          reference?: string | null
          transacted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          report_type: string
          title: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          report_type: string
          title: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          report_type?: string
          title?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "collector" | "group_leader" | "member" | "auditor"
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
    Enums: {
      app_role: ["admin", "collector", "group_leader", "member", "auditor"],
    },
  },
} as const
