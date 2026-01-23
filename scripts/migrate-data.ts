#!/usr/bin/env npx ts-node
/**
 * Data Migration Script
 * 
 * Migrates transaction data from CSV files into the database.
 * Run with: npx ts-node scripts/migrate-data.ts
 * 
 * Prerequisites:
 * - Supabase running locally (npm run supabase:start)
 * - A user must exist in the database
 * - Set SUPABASE_SERVICE_ROLE_KEY in .env.local for admin access
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env' });

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data/txs');
const NUMBERED_WALLETS = ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502', '601', '602', '701', '702'];
const SPECIAL_WALLETS = [
  { name: 'Operación', file: 'operacion' },
  { name: 'Proyectos', file: 'proyectos' }
];

// Category to Label mapping
const CATEGORY_TO_LABEL: Record<string, string> = {
  'Mantenimiento': 'maintenance',
  'Servicios': 'services',
  'Seguridad': 'salaries',
  'Elevador': 'elevator',
  'Donacion': 'donation',
};

// Labels to create
const ALL_LABELS = ['maintenance', 'elevator', 'donation', 'salaries', 'cleaning', 'services'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
const ICONS = ['Wallet', 'Home', 'Shield', 'Wrench', 'Gift', 'Car', 'Zap', 'DollarSign'];

// Multi-month pattern
const MULTI_MONTH_PATTERN = /^(\d{4}-\d{2})(,\d{4}-\d{2})+$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

// Initialize Supabase client with service role for admin access
// Note: Can't use utils/supabase/server.ts as it depends on Next.js cookies()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

interface Transaction {
  date: string;
  wallet: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  note: string;
  labels: string;
}

interface Bill {
  description: string;
  amount: number;
}

interface CSVRow {
  Date: string;
  Wallet: string;
  Type: string;
  'Category name': string;
  Amount: string;
  Currency: string;
  Note: string;
  Labels: string;
}

interface TransferTx {
  id: string;
  wallet_id: string;
  date: string;
  amount_cents: number;
  description: string;
  transfer_id?: string;
}

// Helper to read CSV file
function readCSV<T = CSVRow>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  File not found: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true }) as T[];
}

// Parse multi-month notes and split transactions
function parseTransactions(rows: any[], walletName: string): Transaction[] {
  const transactions: Transaction[] = [];
  
  for (const row of rows) {
    const note = (row['Note'] || '').trim();
    const amount = parseFloat(row['Amount']);
    
    // Check if multi-month transaction
    if (MULTI_MONTH_PATTERN.test(note)) {
      const months = note.split(',').map((m: string) => m.trim());
      const splitAmount = amount / months.length;
      
      for (const month of months) {
        transactions.push({
          date: row['Date'],
          wallet: walletName,
          type: row['Type'],
          category: row['Category name'] || '',
          amount: splitAmount,
          currency: row['Currency'],
          note: month,
          labels: row['Labels'] || '',
        });
      }
    } else {
      transactions.push({
        date: row['Date'],
        wallet: walletName,
        type: row['Type'],
        category: row['Category name'] || '',
        amount,
        currency: row['Currency'],
        note,
        labels: row['Labels'] || '',
      });
    }
  }
  
  return transactions;
}

// Get app transaction type from CSV type
function getAppType(csvType: string): 'income' | 'expense' | 'transfer' {
  if (csvType === 'Income') return 'income';
  if (csvType === 'Expense') return 'expense';
  if (csvType.includes('Transfer')) return 'transfer';
  return 'expense';
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  
  // Get user
  console.log('👤 Getting user...');
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !users?.users?.length) {
    console.error('❌ No user found. Please create a user first.');
    process.exit(1);
  }
  const userId = users.users[0].id;
  console.log(`  Found user: ${userId}\n`);
  
  // =========================================================================
  // PHASE 1: Create Wallets
  // =========================================================================
  console.log('💰 Creating wallets...');
  const walletIds: Record<string, string> = {};
  
  const allWalletNames = [...NUMBERED_WALLETS, ...SPECIAL_WALLETS.map(w => w.name)];
  
  // Fetch all existing wallets in one query
  const { data: existingWallets } = await supabase
    .from('wallets')
    .select('id, name');
  
  const existingWalletMap = new Map<string, string>();
  for (const w of existingWallets || []) {
    existingWalletMap.set(w.name, w.id);
  }
  
  // Find wallets that need to be created
  const walletsToCreate: Array<{ name: string; currency: string }> = [];
  for (const walletName of allWalletNames) {
    if (existingWalletMap.has(walletName)) {
      walletIds[walletName] = existingWalletMap.get(walletName)!;
      console.log(`  ✓ Wallet "${walletName}" already exists`);
    } else {
      walletsToCreate.push({ name: walletName, currency: 'MXN' });
    }
  }
  
  // Batch create new wallets
  if (walletsToCreate.length > 0) {
    const { data: newWallets, error } = await supabase
      .from('wallets')
      .insert(walletsToCreate)
      .select('id, name');
    
    if (error) {
      console.error(`  ✗ Failed to create wallets:`, error.message);
    } else if (newWallets) {
      // Link new wallets to user
      const userWalletLinks = newWallets.map(w => ({
        user_id: userId,
        wallet_id: w.id,
        role: 'editor' as const
      }));
      
      await supabase.from('user_wallets').insert(userWalletLinks);
      
      for (const w of newWallets) {
        walletIds[w.name] = w.id;
        console.log(`  ✓ Created wallet "${w.name}"`);
      }
    }
  }
  console.log();
  
  // =========================================================================
  // PHASE 2: Create Labels
  // =========================================================================
  console.log('🏷️  Creating labels...');
  const labelIds: Record<string, string> = {};
  
  // Fetch all existing labels for this user in one query
  const { data: existingLabels } = await supabase
    .from('labels')
    .select('id, name')
    .eq('user_id', userId);
  
  const existingLabelMap = new Map<string, string>();
  for (const l of existingLabels || []) {
    existingLabelMap.set(l.name, l.id);
  }
  
  // Find labels that need to be created
  const labelsToCreate: Array<{ name: string; color: string; user_id: string }> = [];
  for (let i = 0; i < ALL_LABELS.length; i++) {
    const labelName = ALL_LABELS[i];
    const color = COLORS[i % COLORS.length];
    
    if (existingLabelMap.has(labelName)) {
      labelIds[labelName] = existingLabelMap.get(labelName)!;
      console.log(`  ✓ Label "${labelName}" already exists`);
    } else {
      labelsToCreate.push({ name: labelName, color, user_id: userId });
    }
  }
  
  // Batch create new labels
  if (labelsToCreate.length > 0) {
    const { data: newLabels, error } = await supabase
      .from('labels')
      .insert(labelsToCreate)
      .select('id, name');
    
    if (error) {
      console.error(`  ✗ Failed to create labels:`, error.message);
    } else if (newLabels) {
      for (const l of newLabels) {
        labelIds[l.name] = l.id;
        console.log(`  ✓ Created label "${l.name}"`);
      }
    }
  }
  console.log();
  
  // =========================================================================
  // PHASE 3: Create Categories
  // =========================================================================
  console.log('📁 Creating categories...');
  const categoryIds: Record<string, string> = {};
  
  // Fetch ALL existing categories for this user in one query
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);
  
  const existingCatMap = new Map<string, string>();
  for (const cat of existingCategories || []) {
    existingCatMap.set(`${cat.name}:${cat.type}`, cat.id);
  }
  console.log(`  Found ${existingCatMap.size} existing categories`);
  
  // Read all transactions to get unique categories needed
  const allCategories = new Map<string, Set<string>>();
  
  for (const wallet of NUMBERED_WALLETS) {
    const rows = readCSV(`transactions_export_2026-01-22_${wallet}.csv`);
    for (const row of rows) {
      const cat = (row['Category name'] || '').trim();
      const type = row['Type'];
      if (cat && (type === 'Income' || type === 'Expense')) {
        const appType = type === 'Income' ? 'income' : 'expense';
        if (!allCategories.has(cat)) allCategories.set(cat, new Set());
        allCategories.get(cat)!.add(appType);
      }
    }
  }
  
  for (const sw of SPECIAL_WALLETS) {
    const rows = readCSV(`transactions_export_2026-01-22_${sw.file}.csv`);
    for (const row of rows) {
      const cat = (row['Category name'] || '').trim();
      const type = row['Type'];
      if (cat && (type === 'Income' || type === 'Expense')) {
        const appType = type === 'Income' ? 'income' : 'expense';
        if (!allCategories.has(cat)) allCategories.set(cat, new Set());
        allCategories.get(cat)!.add(appType);
      }
    }
  }
  
  // Add transfer categories to the list
  allCategories.set('Transfer In', new Set(['income']));
  allCategories.set('Transfer Out', new Set(['expense']));
  allCategories.set('Transfer', new Set(['income', 'expense']));
  
  // Build list of categories to create
  const categoriesToCreate: Array<{ name: string; type: string; icon: string; user_id: string }> = [];
  let iconIdx = 0;
  
  for (const [catName, types] of Array.from(allCategories.entries())) {
    for (const catType of Array.from(types)) {
      const key = `${catName}:${catType}`;
      
      if (existingCatMap.has(key)) {
        categoryIds[key] = existingCatMap.get(key)!;
        console.log(`  ✓ Category "${catName}" (${catType}) already exists`);
      } else {
        const icon = catName.includes('Transfer') ? 'ArrowLeftRight' : ICONS[iconIdx % ICONS.length];
        iconIdx++;
        categoriesToCreate.push({ name: catName, type: catType, icon, user_id: userId });
      }
    }
  }
  
  // Batch insert new categories
  if (categoriesToCreate.length > 0) {
    console.log(`  Creating ${categoriesToCreate.length} new categories...`);
    const { data: newCategories, error } = await supabase
      .from('categories')
      .insert(categoriesToCreate)
      .select('id, name, type');
    
    if (error) {
      console.error(`  ✗ Failed to create categories:`, error.message);
    } else if (newCategories) {
      for (const cat of newCategories) {
        const key = `${cat.name}:${cat.type}`;
        categoryIds[key] = cat.id;
        console.log(`  ✓ Created category "${cat.name}" (${cat.type})`);
      }
    }
  }
  console.log();
  
  // =========================================================================
  // PHASE 4: Create Tags
  // =========================================================================
  console.log('🔖 Creating tags...');
  const tagIds: Record<string, string> = {};
  const allTags = new Set<string>();
  
  // Extract tags from all CSVs
  for (const wallet of NUMBERED_WALLETS) {
    const rows = readCSV(`transactions_export_2026-01-22_${wallet}.csv`);
    for (const row of rows) {
      const labels = (row['Labels'] || '').trim();
      if (labels) {
        for (const tag of labels.split(',')) {
          const t = tag.trim();
          if (t && !MONTH_PATTERN.test(t)) allTags.add(t);
        }
      }
    }
  }
  
  for (const sw of SPECIAL_WALLETS) {
    const rows = readCSV(`transactions_export_2026-01-22_${sw.file}.csv`);
    for (const row of rows) {
      const labels = (row['Labels'] || '').trim();
      if (labels) {
        for (const tag of labels.split(',')) {
          const t = tag.trim();
          if (t && !MONTH_PATTERN.test(t)) allTags.add(t);
        }
      }
    }
  }
  
  // Fetch all existing tags for this user in one query
  const { data: existingTags } = await supabase
    .from('tags')
    .select('id, title')
    .eq('user_id', userId);
  
  const existingTagMap = new Map<string, string>();
  for (const t of existingTags || []) {
    existingTagMap.set(t.title, t.id);
  }
  
  // Find tags that need to be created
  const tagsToCreate: Array<{ title: string; user_id: string }> = [];
  for (const tagName of Array.from(allTags)) {
    if (existingTagMap.has(tagName)) {
      tagIds[tagName] = existingTagMap.get(tagName)!;
      console.log(`  ✓ Tag "${tagName}" already exists`);
    } else {
      tagsToCreate.push({ title: tagName, user_id: userId });
    }
  }
  
  // Batch create new tags
  if (tagsToCreate.length > 0) {
    console.log(`  Creating ${tagsToCreate.length} new tags...`);
    const { data: newTags, error } = await supabase
      .from('tags')
      .insert(tagsToCreate)
      .select('id, title');
    
    if (error) {
      console.error(`  ✗ Failed to create tags:`, error.message);
    } else if (newTags) {
      for (const t of newTags) {
        tagIds[t.title] = t.id;
        console.log(`  ✓ Created tag "${t.title}"`);
      }
    }
  }
  console.log();
  
  // =========================================================================
  // PHASE 5: Create Bills (for numbered wallets only)
  // =========================================================================
  console.log('📋 Creating bills...');
  const bills = readCSV<Bill>('bills.csv');
  const billIds: Record<string, Record<string, string>> = {}; // walletName -> description -> id
  
  for (const wallet of NUMBERED_WALLETS) {
    const walletId = walletIds[wallet];
    if (!walletId) continue;
    
    billIds[wallet] = {};
    
    for (const bill of bills) {
      const description = bill.description;
      const amountCents = Math.round(parseFloat(String(bill.amount)) * 100);
      const dueDate = `${description}-01`;
      
      const { data: existing } = await supabase
        .from('bills')
        .select('id')
        .eq('wallet_id', walletId)
        .eq('description', description)
        .single();
      
      if (existing) {
        billIds[wallet][description] = existing.id;
      } else {
        const { data: newBill, error } = await supabase
          .from('bills')
          .insert({
            wallet_id: walletId,
            description,
            amount_cents: amountCents,
            currency: 'MXN',
            due_date: dueDate,
          })
          .select('id')
          .single();
        
        if (error) {
          console.error(`  ✗ Failed to create bill for ${wallet}/${description}:`, error.message);
          continue;
        }
        
        billIds[wallet][description] = newBill.id;
      }
    }
    console.log(`  ✓ Created/verified ${bills.length} bills for wallet ${wallet}`);
  }
  console.log();
  
  // =========================================================================
  // PHASE 6: Import Transactions
  // =========================================================================
  console.log('💳 Importing transactions...');
  const transactionMap: Map<string, string> = new Map(); // key -> transaction id
  
  const allWallets = [
    ...NUMBERED_WALLETS.map(w => ({ name: w, file: w })),
    ...SPECIAL_WALLETS,
  ];
  
  for (const wallet of allWallets) {
    const rows = readCSV(`transactions_export_2026-01-22_${wallet.file}.csv`);
    const transactions = parseTransactions(rows, wallet.name);
    
    console.log(`  Processing ${transactions.length} transactions for wallet "${wallet.name}"...`);
    
    const BATCH_SIZE = 50;
    let inserted = 0;
    
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      const inserts = batch.map(tx => {
        const appType = getAppType(tx.type);
        const amountCents = Math.round(tx.amount * 100);
        
        // Get category
        let categoryId: string | null = null;
        if (appType === 'transfer') {
          const catKey = amountCents > 0 ? 'Transfer In:income' : 'Transfer Out:expense';
          categoryId = categoryIds[catKey] || null;
        } else if (tx.category) {
          const catKey = `${tx.category}:${appType}`;
          categoryId = categoryIds[catKey] || null;
        }
        
        // Get label
        let labelId: string | null = null;
        const mappedLabel = CATEGORY_TO_LABEL[tx.category];
        if (mappedLabel) {
          labelId = labelIds[mappedLabel] || null;
        }
        
        return {
          wallet_id: walletIds[wallet.name],
          date: tx.date.split('T')[0],
          type: appType,
          category_id: categoryId,
          label_id: labelId,
          amount_cents: amountCents,
          currency: tx.currency,
          description: tx.note || null,
        };
      });
      
      const { data: insertedTxs, error } = await supabase
        .from('transactions')
        .insert(inserts)
        .select('id, date, amount_cents, description');
      
      if (error) {
        console.error(`    ✗ Batch insert failed:`, error.message);
        continue;
      }
      
      // Store transaction IDs for later linking
      if (insertedTxs) {
        for (let j = 0; j < insertedTxs.length; j++) {
          const tx = batch[j];
          const inserted = insertedTxs[j];
          const key = `${wallet.name}:${tx.date}:${Math.round(tx.amount * 100)}:${tx.note}`;
          transactionMap.set(key, inserted.id);
        }
        inserted += insertedTxs.length;
      }
    }
    
    console.log(`    ✓ Inserted ${inserted} transactions`);
    
    // Link tags to transactions
    let tagLinked = 0;
    for (const tx of transactions) {
      if (!tx.labels) continue;
      
      const key = `${wallet.name}:${tx.date}:${Math.round(tx.amount * 100)}:${tx.note}`;
      const txId = transactionMap.get(key);
      if (!txId) continue;
      
      const txTags = tx.labels.split(',').map(t => t.trim()).filter(t => t && !MONTH_PATTERN.test(t));
      
      for (const tagName of txTags) {
        const tagId = tagIds[tagName];
        if (tagId) {
          await supabase
            .from('transaction_tags')
            .insert({ transaction_id: txId, tag_id: tagId })
            .single();
          tagLinked++;
        }
      }
    }
    
    if (tagLinked > 0) {
      console.log(`    ✓ Linked ${tagLinked} tags`);
    }
  }
  console.log();
  
  // =========================================================================
  // PHASE 7: Link Bill Payments (Multi-Pass Strategy)
  // =========================================================================
  console.log('🔗 Linking bill payments...');
  
  // Only link transactions with these categories to bills
  const billableCategories = [
    categoryIds['Mantenimiento:income'],
    categoryIds['Deuda:income'],
  ].filter(Boolean);
  
  for (const wallet of NUMBERED_WALLETS) {
    const walletId = walletIds[wallet];
    if (!walletId || !billIds[wallet]) continue;
    
    // Get all INCOME transactions for this wallet with billable categories, sorted by date
    const { data: incomeTxs } = await supabase
      .from('transactions')
      .select('id, date, amount_cents, description, category_id, label_id, currency')
      .eq('wallet_id', walletId)
      .eq('type', 'income')
      .in('category_id', billableCategories)
      .order('date', { ascending: true });
    
    if (!incomeTxs || incomeTxs.length === 0) continue;
    
    // Get all bills for this wallet, sorted by description (chronological)
    const { data: walletBills } = await supabase
      .from('bills')
      .select('id, description, amount_cents')
      .eq('wallet_id', walletId)
      .order('description', { ascending: true });
    
    if (!walletBills || walletBills.length === 0) continue;
    
    // Track which bills have been paid and which transactions have been linked
    const paidBillIds = new Set<string>();
    const linkedTxIds = new Set<string>();
    let totalLinked = 0;
    let splitCount = 0;
    
    // Helper to link a transaction to a bill
    const linkToBill = async (txId: string, billId: string): Promise<boolean> => {
      const { error } = await supabase
        .from('bill_payments')
        .insert({ bill_id: billId, transaction_id: txId });
      if (!error) {
        paidBillIds.add(billId);
        linkedTxIds.add(txId);
        return true;
      }
      return false;
    };
    
    // Helper to get unpaid bills
    const getUnpaidBills = () => {
      return walletBills!.filter(b => !paidBillIds.has(b.id));
    };
    
    // Helper to extract YYYY-MM from a date string
    const getMonthFromDate = (dateStr: string): string => {
      return dateStr.substring(0, 7); // "2024-03-15" -> "2024-03"
    };
    
    // =======================================================================
    // PASS 1: Exact YYYY-MM description match
    // =======================================================================
    for (const tx of incomeTxs) {
      if (linkedTxIds.has(tx.id)) continue;
      if (!tx.description || !MONTH_PATTERN.test(tx.description)) continue;
      
      const billId = billIds[wallet][tx.description];
      if (billId && !paidBillIds.has(billId)) {
        if (await linkToBill(tx.id, billId)) {
          totalLinked++;
        }
      }
    }
    
    // =======================================================================
    // PASS 2: Heuristic match - same month + same amount
    // =======================================================================
    for (const tx of incomeTxs) {
      if (linkedTxIds.has(tx.id)) continue;
      
      const txMonth = getMonthFromDate(tx.date);
      const unpaidBills = getUnpaidBills();
      
      // Find a bill with matching month and amount
      const matchingBill = unpaidBills.find(b => 
        b.description === txMonth && b.amount_cents === tx.amount_cents
      );
      
      if (matchingBill) {
        if (await linkToBill(tx.id, matchingBill.id)) {
          totalLinked++;
        }
      }
    }
    
    // =======================================================================
    // PASS 3: Split large transactions to cover multiple bills
    // =======================================================================
    for (const tx of incomeTxs) {
      if (linkedTxIds.has(tx.id)) continue;
      
      const unpaidBills = getUnpaidBills();
      if (unpaidBills.length === 0) break;
      
      // Find the standard bill amount (most common amount for this wallet)
      const billAmount = unpaidBills[0].amount_cents;
      
      // Check if this transaction can cover multiple bills
      if (tx.amount_cents >= billAmount) {
        const numBillsCovered = Math.floor(tx.amount_cents / billAmount);
        
        if (numBillsCovered >= 1) {
          // Get the bills to cover (chronologically oldest first)
          const billsToCover = unpaidBills.slice(0, numBillsCovered);
          
          if (billsToCover.length === 1) {
            // Just link directly if only one bill
            if (await linkToBill(tx.id, billsToCover[0].id)) {
              totalLinked++;
            }
          } else if (billsToCover.length > 1) {
            // Split the transaction: create new transaction records for each bill
            for (let i = 0; i < billsToCover.length; i++) {
              const bill = billsToCover[i];
              
              if (i === 0) {
                // Link the original transaction to the first bill
                // Update its amount to match the bill amount
                await supabase
                  .from('transactions')
                  .update({ 
                    amount_cents: billAmount,
                    description: bill.description 
                  })
                  .eq('id', tx.id);
                
                if (await linkToBill(tx.id, bill.id)) {
                  totalLinked++;
                }
              } else {
                // Create a new split transaction for subsequent bills
                const { data: splitTx, error } = await supabase
                  .from('transactions')
                  .insert({
                    wallet_id: walletId,
                    date: tx.date,
                    type: 'income',
                    category_id: tx.category_id,
                    label_id: tx.label_id,
                    amount_cents: billAmount,
                    currency: tx.currency,
                    description: bill.description,
                  })
                  .select('id')
                  .single();
                
                if (splitTx && !error) {
                  splitCount++;
                  if (await linkToBill(splitTx.id, bill.id)) {
                    totalLinked++;
                  }
                }
              }
            }
            
            // Mark original as processed
            linkedTxIds.add(tx.id);
            
            // Handle remainder if any
            const remainder = tx.amount_cents - (billsToCover.length * billAmount);
            if (remainder > 0) {
              // Create a remainder transaction (unlinked)
              await supabase
                .from('transactions')
                .insert({
                  wallet_id: walletId,
                  date: tx.date,
                  type: 'income',
                  category_id: tx.category_id,
                  label_id: tx.label_id,
                  amount_cents: remainder,
                  currency: tx.currency,
                  description: tx.description ? `${tx.description} (remainder)` : 'Remainder',
                });
              splitCount++;
            }
          }
        }
      }
    }
    
    // =======================================================================
    // PASS 4: Link remaining transactions to oldest unpaid bills (by chronological order)
    // =======================================================================
    for (const tx of incomeTxs) {
      if (linkedTxIds.has(tx.id)) continue;
      
      const unpaidBills = getUnpaidBills();
      if (unpaidBills.length === 0) break;
      
      // Link to the oldest unpaid bill
      const oldestBill = unpaidBills[0];
      if (await linkToBill(tx.id, oldestBill.id)) {
        totalLinked++;
      }
    }
    
    console.log(`  ✓ Wallet ${wallet}: ${totalLinked} bill payments linked${splitCount > 0 ? `, ${splitCount} transactions split` : ''}`);
  }
  console.log();
  
  // =========================================================================
  // PHASE 8: Link Transfers
  // =========================================================================
  console.log('↔️  Linking transfers...');
  
  // Get all transfer transactions from numbered wallets (outgoing)
  const { data: outgoingTransfersRaw } = await supabase
    .from('transactions')
    .select('id, wallet_id, date, amount_cents, description, transfer_id')
    .eq('type', 'transfer')
    .lt('amount_cents', 0);
  
  // Get all transfer transactions from special wallets (incoming)
  const specialWalletIds = SPECIAL_WALLETS.map(w => walletIds[w.name]).filter(Boolean);
  
  const { data: incomingTransfersRaw } = await supabase
    .from('transactions')
    .select('id, wallet_id, date, amount_cents, description, transfer_id')
    .eq('type', 'transfer')
    .gt('amount_cents', 0)
    .in('wallet_id', specialWalletIds);
  
  const outgoingTransfers = (outgoingTransfersRaw || []) as TransferTx[];
  const incomingTransfers = (incomingTransfersRaw || []) as TransferTx[];
  
  if (outgoingTransfers.length && incomingTransfers.length) {
    let linked = 0;
    const transferCatId = categoryIds['Transfer:expense'];
    const transferInCatId = categoryIds['Transfer:income'];
    
    const usedIncoming = new Set<string>();
    
    for (const outTx of outgoingTransfers) {
      // Skip if already linked
      if (outTx.transfer_id) continue;
      
      // Find matching incoming transfer
      const match = incomingTransfers.find(inTx => 
        !inTx.transfer_id &&
        !usedIncoming.has(inTx.id) &&
        inTx.date === outTx.date &&
        Math.abs(inTx.amount_cents) === Math.abs(outTx.amount_cents) &&
        inTx.description === outTx.description
      );
      
      if (match) {
        const transferId = crypto.randomUUID();
        
        // Update both transactions with shared transfer_id
        await supabase
          .from('transactions')
          .update({ transfer_id: transferId, category_id: transferCatId })
          .eq('id', outTx.id);
        
        await supabase
          .from('transactions')
          .update({ transfer_id: transferId, category_id: transferInCatId })
          .eq('id', match.id);
        
        linked++;
        
        // Mark as used
        usedIncoming.add(match.id);
      }
    }
    
    console.log(`  ✓ Linked ${linked} transfer pairs`);
  }
  console.log();
  
  console.log('✅ Migration complete!');
}

main().catch(console.error);

