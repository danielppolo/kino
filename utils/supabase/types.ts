import { Database } from "./database.types";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
