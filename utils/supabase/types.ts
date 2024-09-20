import { Database } from "./database.types";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Intention = Database["public"]["Tables"]["intentions"]["Row"];
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
