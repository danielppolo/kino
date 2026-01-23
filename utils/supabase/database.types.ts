export interface Database {
  public: {
    Tables: {
      wallets: {
        Row: {
          id: string;
          name: string;
          currency: string;
          balance_cents?: number;
          visible?: boolean;
          color?: string;
          position?: number;
        };
        Insert: {
          id?: string;
          name: string;
          currency: string;
          balance_cents?: number;
          visible?: boolean;
          color?: string;
          position?: number;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          balance_cents?: number;
          visible?: boolean;
          color?: string;
          position?: number;
        };
      };
      transactions: {
        Row: {
          id: string;
          wallet_id: string;
          category_id: string;
          label_id?: string;
          amount_cents: number;
          currency: string;
          description?: string;
          date: string;
          type: string;
          tag_ids?: string[];
        };
        Insert: {
          id?: string;
          wallet_id: string;
          category_id: string;
          label_id?: string;
          amount_cents: number;
          currency: string;
          description?: string;
          date: string;
          type: string;
          tag_ids?: string[];
        };
        Update: {
          id?: string;
          wallet_id?: string;
          category_id?: string;
          label_id?: string;
          amount_cents?: number;
          currency?: string;
          description?: string;
          date?: string;
          type?: string;
          tag_ids?: string[];
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          type: string;
          icon: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          icon: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          icon?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
        };
      };
      views: {
        Row: {
          id: string;
          name: string;
          filters: any;
        };
        Insert: {
          id?: string;
          name: string;
          filters: any;
        };
        Update: {
          id?: string;
          name?: string;
          filters?: any;
        };
      };
      transaction_templates: {
        Row: {
          id: string;
          name: string;
          type: string;
          amount_cents: number;
          currency: string;
          category_id: string;
          label_id?: string;
          description?: string;
          tag_ids?: string[];
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          amount_cents: number;
          currency: string;
          category_id: string;
          label_id?: string;
          description?: string;
          tag_ids?: string[];
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          amount_cents?: number;
          currency?: string;
          category_id?: string;
          label_id?: string;
          description?: string;
          tag_ids?: string[];
        };
      };
      bills: {
        Row: {
          id: string;
          wallet_id: string;
          description: string;
          amount_cents: number;
          currency: string;
          due_date: string;
          created_at?: string;
          interval_type?: string | null;
          is_recurring?: boolean;
          recurring_bill_id?: string | null;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          description: string;
          amount_cents: number;
          currency: string;
          due_date: string;
          created_at?: string;
          interval_type?: string | null;
          is_recurring?: boolean;
          recurring_bill_id?: string | null;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          description?: string;
          amount_cents?: number;
          currency?: string;
          due_date?: string;
          created_at?: string;
          interval_type?: string | null;
          is_recurring?: boolean;
          recurring_bill_id?: string | null;
        };
      };
      bill_payments: {
        Row: {
          id: string;
          bill_id: string;
          transaction_id: string;
          created_at?: string;
        };
        Insert: {
          id?: string;
          bill_id: string;
          transaction_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bill_id?: string;
          transaction_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      transaction_list: {
        Row: {
          id: string;
          wallet_id: string;
          category_id: string;
          label_id?: string;
          amount_cents: number;
          currency: string;
          description?: string;
          date: string;
          type: string;
          tag_ids?: string[];
          categories?: {
            id: string;
            name: string;
            type: string;
            icon: string;
          };
          labels?: {
            id: string;
            name: string;
            color: string;
          };
        };
      };
    };
  };
}
