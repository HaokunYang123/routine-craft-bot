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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string
          assignee_id: string | null
          created_at: string | null
          end_date: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          schedule_days: number[] | null
          schedule_type: string
          start_date: string
          template_id: string | null
        }
        Insert: {
          assigned_by: string
          assignee_id?: string | null
          created_at?: string | null
          end_date?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          schedule_days?: number[] | null
          schedule_type?: string
          start_date?: string
          template_id?: string | null
        }
        Update: {
          assigned_by?: string
          assignee_id?: string | null
          created_at?: string | null
          end_date?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          schedule_days?: number[] | null
          schedule_type?: string
          start_date?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      class_members: {
        Row: {
          class_session_id: string
          display_name: string | null
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          class_session_id: string
          display_name?: string | null
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          class_session_id?: string
          display_name?: string | null
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          coach_id: string
          created_at: string
          default_template_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          join_code: string
          name: string
          qr_token: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          default_template_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          join_code: string
          name: string
          qr_token?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          default_template_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          join_code?: string
          name?: string
          qr_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          coach_id: string
          color: string
          created_at: string | null
          icon: string | null
          id: string
          join_code: string
          name: string
          qr_token: string | null
        }
        Insert: {
          coach_id: string
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          join_code: string
          name: string
          qr_token?: string | null
        }
        Update: {
          coach_id?: string
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          join_code?: string
          name?: string
          qr_token?: string | null
        }
        Relationships: []
      }
      instructor_students: {
        Row: {
          class_session_id: string | null
          created_at: string | null
          id: string
          instructor_id: string
          student_id: string
        }
        Insert: {
          class_session_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id: string
          student_id: string
        }
        Update: {
          class_session_id?: string | null
          created_at?: string | null
          id?: string
          instructor_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_students_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          class_session_id: string | null
          content: string
          created_at: string | null
          from_user_id: string
          group_id: string | null
          id: string
          tags: string[] | null
          title: string | null
          to_user_id: string | null
          visibility: string | null
        }
        Insert: {
          class_session_id?: string | null
          content: string
          created_at?: string | null
          from_user_id: string
          group_id?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
          to_user_id?: string | null
          visibility?: string | null
        }
        Update: {
          class_session_id?: string | null
          content?: string
          created_at?: string | null
          from_user_id?: string
          group_id?: string | null
          id?: string
          tags?: string[] | null
          title?: string | null
          to_user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          assigned_student_id: string | null
          class_session_id: string | null
          created_at: string | null
          custom_interval_days: number | null
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          recurrence_type: string
          start_date: string
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_student_id?: string | null
          class_session_id?: string | null
          created_at?: string | null
          custom_interval_days?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          recurrence_type: string
          start_date?: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_student_id?: string | null
          class_session_id?: string | null
          created_at?: string | null
          custom_interval_days?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          recurrence_type?: string
          start_date?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          person_id: string | null
          schedule: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          person_id?: string | null
          schedule?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          person_id?: string | null
          schedule?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      stickers: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string
          rarity: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name: string
          rarity?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          rarity?: string | null
        }
        Relationships: []
      }
      student_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          sentiment: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          sentiment: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          sentiment?: string
          user_id?: string
        }
        Relationships: []
      }
      task_instances: {
        Row: {
          assignee_id: string
          assignment_id: string | null
          coach_note: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_customized: boolean
          name: string
          scheduled_date: string
          scheduled_time: string | null
          status: string
          student_note: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assignee_id: string
          assignment_id?: string | null
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_customized?: boolean
          name: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          student_note?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assignee_id?: string
          assignment_id?: string | null
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_customized?: boolean
          name?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          student_note?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_student_id: string | null
          batch_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          is_completed: boolean | null
          person_id: string | null
          priority: string | null
          recurring_schedule_id: string | null
          routine_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_student_id?: string | null
          batch_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          person_id?: string | null
          priority?: string | null
          recurring_schedule_id?: string | null
          routine_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_student_id?: string | null
          batch_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          person_id?: string | null
          priority?: string | null
          recurring_schedule_id?: string | null
          routine_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          created_at: string | null
          day_offset: number
          description: string | null
          duration_minutes: number | null
          id: string
          sort_order: number | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          day_offset?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          sort_order?: number | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          day_offset?: number
          description?: string | null
          duration_minutes?: number | null
          id?: string
          sort_order?: number | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string | null
          coach_id: string
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          frequency_per_week: number | null
          id: string
          is_ai_generated: boolean | null
          name: string
          tags: string[] | null
          updated_at: string | null
          weeks: Json | null
        }
        Insert: {
          category?: string | null
          coach_id: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          frequency_per_week?: number | null
          id?: string
          is_ai_generated?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
          weeks?: Json | null
        }
        Update: {
          category?: string | null
          coach_id?: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          frequency_per_week?: number | null
          id?: string
          is_ai_generated?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
          weeks?: Json | null
        }
        Relationships: []
      }
      user_stickers: {
        Row: {
          earned_at: string
          id: string
          sticker_id: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          earned_at?: string
          id?: string
          sticker_id: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          earned_at?: string
          id?: string
          sticker_id?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stickers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_join_code: string }; Returns: Json }
      assign_template_to_student: {
        Args: {
          p_start_date?: string
          p_student_id: string
          p_template_id: string
        }
        Returns: Json
      }
      delete_class_session: { Args: { p_session_id: string }; Returns: Json }
      generate_group_join_code: { Args: never; Returns: string }
      generate_join_code: { Args: never; Returns: string }
      generate_recurring_tasks: {
        Args: {
          p_from_date?: string
          p_schedule_id: string
          p_to_date?: string
        }
        Returns: Json
      }
      get_group_members_for_user: {
        Args: { p_group_id: string }
        Returns: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      join_group_by_code: { Args: { p_join_code: string }; Returns: Json }
      remove_student_from_class: {
        Args: { p_connection_id: string }
        Returns: Json
      }
      validate_group_join_code: {
        Args: { code: string }
        Returns: {
          coach_id: string
          group_id: string
          group_name: string
        }[]
      }
      validate_join_code: {
        Args: { code: string }
        Returns: {
          coach_id: string
          session_id: string
          session_name: string
        }[]
      }
      validate_qr_token: {
        Args: { token: string }
        Returns: {
          coach_id: string
          session_id: string
          session_name: string
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
