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
