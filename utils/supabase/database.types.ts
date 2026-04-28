export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      bill_payments: {
        Row: {
          bill_id: string;
          created_at: string | null;
          id: string;
          transaction_id: string;
        };
        Insert: {
          bill_id: string;
          created_at?: string | null;
          id?: string;
          transaction_id: string;
        };
        Update: {
          bill_id?: string;
          created_at?: string | null;
          id?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: true;
            referencedRelation: "transaction_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: true;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      bills: {
        Row: {
          amount_cents: number;
          created_at: string | null;
          currency: string;
          description: string;
          due_date: string;
          id: string;
          interval_type: string | null;
          is_recurring: boolean | null;
          recurrent_bill_id: string | null;
          recurring_bill_id: string | null;
          wallet_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string | null;
          currency: string;
          description: string;
          due_date: string;
          id?: string;
          interval_type?: string | null;
          is_recurring?: boolean | null;
          recurrent_bill_id?: string | null;
          recurring_bill_id?: string | null;
          wallet_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string | null;
          currency?: string;
          description?: string;
          due_date?: string;
          id?: string;
          interval_type?: string | null;
          is_recurring?: boolean | null;
          recurrent_bill_id?: string | null;
          recurring_bill_id?: string | null;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bills_recurrent_bill_id_fkey";
            columns: ["recurrent_bill_id"];
            isOneToOne: false;
            referencedRelation: "recurrent_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_recurring_bill_id_fkey";
            columns: ["recurring_bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          icon: string;
          id: string;
          keywords: string[] | null;
          name: string;
          required_spend_kind: string;
          type: string;
          workspace_id: string;
        };
        Insert: {
          icon: string;
          id?: string;
          keywords?: string[] | null;
          name: string;
          required_spend_kind?: string;
          type: string;
          workspace_id: string;
        };
        Update: {
          icon?: string;
          id?: string;
          keywords?: string[] | null;
          name?: string;
          required_spend_kind?: string;
          type?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      currency_conversions: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          rate: number;
          source_currency: string;
          target_currency: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          rate: number;
          source_currency: string;
          target_currency: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          rate?: number;
          source_currency?: string;
          target_currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      labels: {
        Row: {
          color: string;
          id: string;
          name: string;
          workspace_id: string;
        };
        Insert: {
          color: string;
          id?: string;
          name: string;
          workspace_id: string;
        };
        Update: {
          color?: string;
          id?: string;
          name?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "labels_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_category_stats: {
        Row: {
          category_id: string | null;
          created_at: string;
          id: string;
          income_cents: number;
          month: string;
          net_cents: number;
          outcome_cents: number;
          transaction_count: number;
          updated_at: string;
          wallet_id: string | null;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          income_cents?: number;
          month: string;
          net_cents?: number;
          outcome_cents?: number;
          transaction_count?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          income_cents?: number;
          month?: string;
          net_cents?: number;
          outcome_cents?: number;
          transaction_count?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_category_stats_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_category_stats_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_label_stats: {
        Row: {
          created_at: string;
          id: string;
          income_cents: number;
          label_id: string | null;
          month: string;
          net_cents: number;
          outcome_cents: number;
          transaction_count: number;
          updated_at: string;
          wallet_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          income_cents?: number;
          label_id?: string | null;
          month: string;
          net_cents?: number;
          outcome_cents?: number;
          transaction_count?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          income_cents?: number;
          label_id?: string | null;
          month?: string;
          net_cents?: number;
          outcome_cents?: number;
          transaction_count?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_label_stats_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_label_stats_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_stats: {
        Row: {
          created_at: string;
          id: string;
          income_cents: number;
          month: string;
          net_cents: number;
          outcome_cents: number;
          updated_at: string;
          wallet_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          income_cents?: number;
          month: string;
          net_cents?: number;
          outcome_cents?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          income_cents?: number;
          month?: string;
          net_cents?: number;
          outcome_cents?: number;
          updated_at?: string;
          wallet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_stats_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      real_estate_asset_valuations: {
        Row: {
          asset_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          updated_at: string;
          valuation_amount_cents: number;
          valuation_date: string;
          valuation_method: string | null;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          valuation_amount_cents: number;
          valuation_date: string;
          valuation_method?: string | null;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          valuation_amount_cents?: number;
          valuation_date?: string;
          valuation_method?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "real_estate_asset_valuations_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "real_estate_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      real_estate_assets: {
        Row: {
          acquired_on: string | null;
          asset_type: Database["public"]["Enums"]["real_estate_asset_type"];
          created_at: string;
          currency: string;
          id: string;
          metadata: Json;
          name: string;
          notes: string | null;
          origin_transaction_id: string | null;
          status: Database["public"]["Enums"]["real_estate_asset_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          acquired_on?: string | null;
          asset_type?: Database["public"]["Enums"]["real_estate_asset_type"];
          created_at?: string;
          currency: string;
          id?: string;
          metadata?: Json;
          name: string;
          notes?: string | null;
          origin_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["real_estate_asset_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          acquired_on?: string | null;
          asset_type?: Database["public"]["Enums"]["real_estate_asset_type"];
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          notes?: string | null;
          origin_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["real_estate_asset_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "real_estate_assets_origin_transaction_id_fkey";
            columns: ["origin_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transaction_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "real_estate_assets_origin_transaction_id_fkey";
            columns: ["origin_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "real_estate_assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      recurrent_bills: {
        Row: {
          amount_cents: number;
          created_at: string | null;
          currency: string;
          description: string;
          end_date: string | null;
          id: string;
          interval_type: string;
          next_due_date: string | null;
          start_date: string;
          wallet_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string | null;
          currency: string;
          description: string;
          end_date?: string | null;
          id?: string;
          interval_type: string;
          next_due_date?: string | null;
          start_date: string;
          wallet_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string | null;
          currency?: string;
          description?: string;
          end_date?: string | null;
          id?: string;
          interval_type?: string;
          next_due_date?: string | null;
          start_date?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurrent_bills_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_transactions: {
        Row: {
          amount_cents: number;
          category_id: string;
          currency: string;
          description: string | null;
          end_date: string | null;
          id: string;
          interval_type: string;
          label_id: string | null;
          next_run_date: string | null;
          start_date: string;
          tags: string[] | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id: string;
        };
        Insert: {
          amount_cents: number;
          category_id: string;
          currency: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          interval_type: string;
          label_id?: string | null;
          next_run_date?: string | null;
          start_date: string;
          tags?: string[] | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id: string;
        };
        Update: {
          amount_cents?: number;
          category_id?: string;
          currency?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          interval_type?: string;
          label_id?: string | null;
          next_run_date?: string | null;
          start_date?: string;
          tags?: string[] | null;
          type?: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_transactions_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string | null;
          group: string | null;
          id: string;
          title: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          group?: string | null;
          id?: string;
          title: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          group?: string | null;
          id?: string;
          title?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_tags: {
        Row: {
          tag_id: string;
          transaction_id: string;
        };
        Insert: {
          tag_id: string;
          transaction_id: string;
        };
        Update: {
          tag_id?: string;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transaction_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_templates: {
        Row: {
          amount_cents: number | null;
          category_id: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          id: string;
          label_id: string | null;
          name: string;
          tags: string[] | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          workspace_id: string;
        };
        Insert: {
          amount_cents?: number | null;
          category_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          label_id?: string | null;
          name: string;
          tags?: string[] | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          workspace_id: string;
        };
        Update: {
          amount_cents?: number | null;
          category_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          label_id?: string | null;
          name?: string;
          tags?: string[] | null;
          type?: Database["public"]["Enums"]["transaction_type_enum"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_templates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_templates_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_templates_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      plaid_transaction_rules: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          merchant_key: string;
          updated_at: string;
          wallet_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          merchant_key: string;
          updated_at?: string;
          wallet_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          merchant_key?: string;
          updated_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plaid_transaction_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plaid_transaction_rules_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount_cents: number;
          base_amount_cents: number | null;
          category_id: string | null;
          conversion_rate_to_base: number | null;
          created_at: string | null;
          currency: string;
          date: string;
          description: string | null;
          id: string;
          label_id: string | null;
          note: string | null;
          plaid_merchant_key: string | null;
          plaid_merchant_name: string | null;
          plaid_personal_finance_category_primary: string | null;
          plaid_transaction_id: string | null;
          tags: string[] | null;
          transfer_id: string | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id: string;
        };
        Insert: {
          amount_cents: number;
          base_amount_cents?: number | null;
          category_id?: string | null;
          conversion_rate_to_base?: number | null;
          created_at?: string | null;
          currency: string;
          date: string;
          description?: string | null;
          id?: string;
          label_id?: string | null;
          note?: string | null;
          plaid_merchant_key?: string | null;
          plaid_merchant_name?: string | null;
          plaid_personal_finance_category_primary?: string | null;
          plaid_transaction_id?: string | null;
          tags?: string[] | null;
          transfer_id?: string | null;
          type: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id: string;
        };
        Update: {
          amount_cents?: number;
          base_amount_cents?: number | null;
          category_id?: string | null;
          conversion_rate_to_base?: number | null;
          created_at?: string | null;
          currency?: string;
          date?: string;
          description?: string | null;
          id?: string;
          label_id?: string | null;
          note?: string | null;
          plaid_merchant_key?: string | null;
          plaid_merchant_name?: string | null;
          plaid_personal_finance_category_primary?: string | null;
          plaid_transaction_id?: string | null;
          tags?: string[] | null;
          transfer_id?: string | null;
          type?: Database["public"]["Enums"]["transaction_type_enum"];
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          active_workspace_id: string | null;
          created_at: string;
          id: string;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_workspace_id?: string | null;
          created_at?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_workspace_id?: string | null;
          created_at?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_active_workspace_id_fkey";
            columns: ["active_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      user_wallets: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
          wallet_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
          wallet_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_wallets_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      views: {
        Row: {
          id: string;
          name: string;
          query_params: string;
          workspace_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          query_params: string;
          workspace_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          query_params?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "views_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_monthly_balances: {
        Row: {
          balance_cents: number;
          created_at: string;
          id: string;
          month: string;
          updated_at: string;
          wallet_id: string;
        };
        Insert: {
          balance_cents?: number;
          created_at?: string;
          id?: string;
          month: string;
          updated_at?: string;
          wallet_id: string;
        };
        Update: {
          balance_cents?: number;
          created_at?: string;
          id?: string;
          month?: string;
          updated_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_monthly_balances_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_monthly_owed: {
        Row: {
          created_at: string;
          id: string;
          month: string;
          owed_cents: number;
          updated_at: string;
          wallet_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          month: string;
          owed_cents?: number;
          updated_at?: string;
          wallet_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          month?: string;
          owed_cents?: number;
          updated_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_monthly_owed_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          balance_cents: number | null;
          color: string | null;
          currency: string;
          id: string;
          name: string;
          notes: string | null;
          plaid_access_token_encrypted: string | null;
          plaid_account_id: string | null;
          plaid_account_mask: string | null;
          plaid_account_name: string | null;
          plaid_institution_name: string | null;
          plaid_item_id: string | null;
          plaid_last_refreshed_at: string | null;
          plaid_sync_enabled: boolean;
          plaid_sync_start_at: string | null;
          position: number | null;
          visible: boolean;
          wallet_type: Database["public"]["Enums"]["wallet_type"];
          workspace_id: string;
        };
        Insert: {
          balance_cents?: number | null;
          color?: string | null;
          currency: string;
          id?: string;
          name: string;
          notes?: string | null;
          plaid_access_token_encrypted?: string | null;
          plaid_account_id?: string | null;
          plaid_account_mask?: string | null;
          plaid_account_name?: string | null;
          plaid_institution_name?: string | null;
          plaid_item_id?: string | null;
          plaid_last_refreshed_at?: string | null;
          plaid_sync_enabled?: boolean;
          plaid_sync_start_at?: string | null;
          position?: number | null;
          visible?: boolean;
          wallet_type?: Database["public"]["Enums"]["wallet_type"];
          workspace_id: string;
        };
        Update: {
          balance_cents?: number | null;
          color?: string | null;
          currency?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          plaid_access_token_encrypted?: string | null;
          plaid_account_id?: string | null;
          plaid_account_mask?: string | null;
          plaid_account_name?: string | null;
          plaid_institution_name?: string | null;
          plaid_item_id?: string | null;
          plaid_last_refreshed_at?: string | null;
          plaid_sync_enabled?: boolean;
          plaid_sync_start_at?: string | null;
          position?: number | null;
          visible?: boolean;
          wallet_type?: Database["public"]["Enums"]["wallet_type"];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          base_currency: string;
          created_at: string;
          finance_memory: Json | null;
          feature_flags: Json | null;
          id: string;
          icon: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          base_currency?: string;
          created_at?: string;
          finance_memory?: Json | null;
          feature_flags?: Json | null;
          id?: string;
          icon?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          base_currency?: string;
          created_at?: string;
          finance_memory?: Json | null;
          feature_flags?: Json | null;
          id?: string;
          icon?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      transaction_list: {
        Row: {
          amount_cents: number | null;
          base_amount_cents: number | null;
          category_id: string | null;
          created_at: string | null;
          currency: string | null;
          date: string | null;
          description: string | null;
          id: string | null;
          label_id: string | null;
          needs_review: boolean | null;
          note: string | null;
          plaid_merchant_key: string | null;
          plaid_merchant_name: string | null;
          plaid_personal_finance_category_primary: string | null;
          plaid_transaction_id: string | null;
          tag_ids: string[] | null;
          tags: string[] | null;
          transfer_id: string | null;
          transfer_wallet_id: string | null;
          type: Database["public"]["Enums"]["transaction_type_enum"] | null;
          wallet_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_members: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string | null;
          phone: string | null;
          role: string | null;
          user_id: string | null;
          wallet_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_wallets_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      backfill_monthly_stats: { Args: never; Returns: undefined };
      backfill_monthly_stats_with_transfers: {
        Args: never;
        Returns: undefined;
      };
      backfill_transaction_base_amounts: { Args: never; Returns: undefined };
      backfill_wallet_monthly_balances: { Args: never; Returns: undefined };
      backfill_wallet_monthly_owed: { Args: never; Returns: undefined };
      calculate_wallet_owed: { Args: { p_wallet_id: string }; Returns: number };
      get_cashflow_breakdown: {
        Args: {
          p_category_id?: string;
          p_description?: string;
          p_from_date?: string;
          p_id?: string;
          p_label_id?: string;
          p_tag?: string;
          p_to_date?: string;
          p_transfer_id?: string;
          p_type?: string;
          p_wallet_id?: string;
        };
        Returns: {
          total_cashflow: number;
          total_expenses: number;
          total_incomes: number;
        }[];
      };
      get_month_start: { Args: { date_value: string }; Returns: string };
      get_transaction_total: {
        Args: {
          p_category_id?: string;
          p_description?: string;
          p_from_date?: string;
          p_id?: string;
          p_label_id?: string;
          p_tag?: string;
          p_to_date?: string;
          p_transfer_id?: string;
          p_type?: string;
          p_wallet_id?: string;
        };
        Returns: number;
      };
      get_transaction_total_by_currency: {
        Args: {
          p_category_id?: string;
          p_description?: string;
          p_from_date?: string;
          p_id?: string;
          p_label_id?: string;
          p_tag_id?: string;
          p_to_date?: string;
          p_transfer_id?: string;
          p_type?: string;
          p_wallet_id?: string;
        };
        Returns: {
          currency: string;
          total_cents: number;
          transaction_count: number;
        }[];
      };
      get_transfer_wallet_id: {
        Args: { p_transaction_id: string; p_transfer_id: string };
        Returns: string;
      };
      get_user_id_by_email: {
        Args: { user_email: string };
        Returns: {
          email: string;
          user_id: string;
        }[];
      };
      get_wallet_members: {
        Args: { wallet_uuid: string };
        Returns: {
          created_at: string;
          email: string;
          id: string;
          phone: string;
          role: string;
          user_id: string;
          wallet_id: string;
        }[];
      };
      has_workspace_role: {
        Args: { required_role: string[]; workspace_uuid: string };
        Returns: boolean;
      };
      insert_wallet_and_user_wallet:
        | {
            Args: { wallet_currency: string; wallet_name: string };
            Returns: {
              wallet_id: string;
            }[];
          }
        | {
            Args: {
              p_wallet_type?: Database["public"]["Enums"]["wallet_type"];
              p_workspace_id: string;
              wallet_currency: string;
              wallet_name: string;
            };
            Returns: {
              wallet_id: string;
            }[];
          };
      is_workspace_member: {
        Args: { workspace_uuid: string };
        Returns: boolean;
      };
      lookup_user_by_email: {
        Args: { user_email: string };
        Returns: {
          email: string;
          id: string;
        }[];
      };
    };
    Enums: {
      real_estate_asset_status: "active" | "sold" | "archived";
      real_estate_asset_type:
        | "primary_home"
        | "rental_property"
        | "land"
        | "commercial_property"
        | "other_real_estate";
      wallet_type: "bank_account" | "card" | "cash";
      transaction_type_enum: "income" | "expense" | "transfer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          level: number | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _bucket_id: string; _name: string };
        Returns: boolean;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_level: { Args: { name: string }; Returns: number };
      get_prefix: { Args: { name: string }; Returns: string };
      get_prefixes: { Args: { name: string }; Returns: string[] };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          start_after?: string;
        };
        Returns: {
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_legacy_v1: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v1_optimised: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      real_estate_asset_status: ["active", "sold", "archived"],
      real_estate_asset_type: [
        "primary_home",
        "rental_property",
        "land",
        "commercial_property",
        "other_real_estate",
      ],
      wallet_type: ["bank_account", "card", "cash"],
      transaction_type_enum: ["income", "expense", "transfer"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
