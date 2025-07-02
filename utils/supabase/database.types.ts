export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      categories: {
        Row: {
          icon: string
          id: string
          keywords: string[] | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          icon: string
          id?: string
          keywords?: string[] | null
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          icon?: string
          id?: string
          keywords?: string[] | null
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      currency_conversions: {
        Row: {
          created_at: string
          id: string
          rate: number
          source_currency: string
          target_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rate: number
          source_currency: string
          target_currency: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          rate?: number
          source_currency?: string
          target_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          color: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_category_stats: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          income_cents: number
          month: string
          net_cents: number
          outcome_cents: number
          transaction_count: number
          updated_at: string
          wallet_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          income_cents?: number
          month: string
          net_cents?: number
          outcome_cents?: number
          transaction_count?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          income_cents?: number
          month?: string
          net_cents?: number
          outcome_cents?: number
          transaction_count?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_category_stats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_category_stats_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_label_stats: {
        Row: {
          created_at: string
          id: string
          income_cents: number
          label_id: string | null
          month: string
          net_cents: number
          outcome_cents: number
          transaction_count: number
          updated_at: string
          wallet_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          income_cents?: number
          label_id?: string | null
          month: string
          net_cents?: number
          outcome_cents?: number
          transaction_count?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          income_cents?: number
          label_id?: string | null
          month?: string
          net_cents?: number
          outcome_cents?: number
          transaction_count?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_label_stats_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_label_stats_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_stats: {
        Row: {
          created_at: string
          id: string
          income_cents: number
          month: string
          net_cents: number
          outcome_cents: number
          updated_at: string
          wallet_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          income_cents?: number
          month: string
          net_cents?: number
          outcome_cents?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          income_cents?: number
          month?: string
          net_cents?: number
          outcome_cents?: number
          updated_at?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_stats_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount_cents: number
          category_id: string
          currency: string
          description: string | null
          end_date: string | null
          id: string
          interval_type: string
          label_id: string | null
          next_run_date: string | null
          start_date: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          currency: string
          description?: string | null
          end_date?: string | null
          id?: string
          interval_type: string
          label_id?: string | null
          next_run_date?: string | null
          start_date: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          id?: string
          interval_type?: string
          label_id?: string | null
          next_run_date?: string | null
          start_date?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          group: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group?: string | null
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          group?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_templates: {
        Row: {
          amount_cents: number | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          label_id: string | null
          name: string
          tags: string[] | null
          type: Database["public"]["Enums"]["transaction_type_enum"]
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          label_id?: string | null
          name: string
          tags?: string[] | null
          type: Database["public"]["Enums"]["transaction_type_enum"]
          user_id?: string
        }
        Update: {
          amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          label_id?: string | null
          name?: string
          tags?: string[] | null
          type?: Database["public"]["Enums"]["transaction_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          base_amount_cents: number | null
          category_id: string | null
          created_at: string | null
          conversion_rate_to_base: string | null
          currency: string
          date: string
          description: string | null
          id: string
          label_id: string | null
          note: string | null
          tags: string[] | null
          transfer_id: string | null
          type: Database["public"]["Enums"]["transaction_type_enum"]
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          base_amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          conversion_rate_to_base?: string | null
          currency: string
          date: string
          description?: string | null
          id?: string
          label_id?: string | null
          note?: string | null
          tags?: string[] | null
          transfer_id?: string | null
          type: Database["public"]["Enums"]["transaction_type_enum"]
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          base_amount_cents?: number | null
          category_id?: string | null
          created_at?: string | null
          conversion_rate_to_base?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          label_id?: string | null
          note?: string | null
          tags?: string[] | null
          transfer_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type_enum"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          id: string
          name: string
          query_params: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          query_params: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          query_params?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_monthly_balances: {
        Row: {
          balance_cents: number
          created_at: string
          id: string
          month: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_monthly_balances_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number | null
          color: string | null
          currency: string
          id: string
          name: string
          position: number | null
          visible: boolean
        }
        Insert: {
          balance_cents?: number | null
          color?: string | null
          currency: string
          id?: string
          name: string
          position?: number | null
          visible?: boolean
        }
        Update: {
          balance_cents?: number | null
          color?: string | null
          currency?: string
          id?: string
          name?: string
          position?: number | null
          visible?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      transaction_list: {
        Row: {
          amount_cents: number | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          id: string | null
          label_id: string | null
          note: string | null
          tag_ids: string[] | null
          tags: string[] | null
          transfer_id: string | null
          transfer_wallet_id: string | null
          type: Database["public"]["Enums"]["transaction_type_enum"] | null
          wallet_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      backfill_monthly_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      backfill_monthly_stats_with_transfers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      backfill_wallet_monthly_balances: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_month_start: {
        Args: { date_value: string }
        Returns: string
      }
      insert_wallet_and_user_wallet: {
        Args: { wallet_name: string; wallet_currency: string }
        Returns: {
          wallet_id: string
        }[]
      }
    }
    Enums: {
      transaction_type_enum: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      transaction_type_enum: ["income", "expense", "transfer"],
    },
  },
  storage: {
    Enums: {},
  },
} as const

