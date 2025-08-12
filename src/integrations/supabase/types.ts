export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      creator_profiles: {
        Row: {
          audience: string | null
          auto_generation_enabled: boolean
          bio: string | null
          brand_keywords: string[] | null
          cadence: string | null
          created_at: string
          ctas: string[] | null
          do_donts: Json | null
          goals: string | null
          links: Json | null
          niche: string | null
          platform_prefs: Json | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          auto_generation_enabled?: boolean
          bio?: string | null
          brand_keywords?: string[] | null
          cadence?: string | null
          created_at?: string
          ctas?: string[] | null
          do_donts?: Json | null
          goals?: string | null
          links?: Json | null
          niche?: string | null
          platform_prefs?: Json | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          auto_generation_enabled?: boolean
          bio?: string | null
          brand_keywords?: string[] | null
          cadence?: string | null
          created_at?: string
          ctas?: string[] | null
          do_donts?: Json | null
          goals?: string | null
          links?: Json | null
          niche?: string | null
          platform_prefs?: Json | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_posts: {
        Row: {
          asset_id: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          platform: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      library_assets: {
        Row: {
          audio_path: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          metadata: Json | null
          session_id: string | null
          thumbnail_path: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          thumbnail_path?: string | null
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          thumbnail_path?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          audio_path: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          question: string
          question_index: number
          session_id: string
          transcript: string | null
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question: string
          question_index: number
          session_id: string
          transcript?: string | null
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question?: string
          question_index?: number
          session_id?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: []
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
