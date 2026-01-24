#!/usr/bin/env node

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

interface Transaction {
  id: string;
  amount_cents: string;
  type: string;
  [key: string]: string;
}

const csvPath = '/Users/danielppolo/Downloads/latest-701.csv';

console.log('Reading CSV file...');
const csvContent = readFileSync(csvPath, 'utf-8');

console.log('Parsing CSV...');
const records: Transaction[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});

console.log(`Found ${records.length} transactions`);

let totalCents = 0;
let expenseCount = 0;
let incomeCount = 0;
let transferCount = 0;

for (const record of records) {
  const amountCents = parseInt(record.amount_cents, 10);
  
  if (isNaN(amountCents)) {
    console.warn(`Warning: Invalid amount_cents for transaction ${record.id}: ${record.amount_cents}`);
    continue;
  }
  
  totalCents += amountCents;
  
  if (record.type === 'expense') {
    expenseCount++;
  } else if (record.type === 'income') {
    incomeCount++;
  } else if (record.type === 'transfer') {
    transferCount++;
  }
}

const totalAmount = totalCents / 100;
const expectedBalance = -1500;
const difference = totalAmount - expectedBalance;

console.log('\n=== Balance Summary ===');
console.log(`Total transactions: ${records.length}`);
console.log(`  - Expenses: ${expenseCount}`);
console.log(`  - Income: ${incomeCount}`);
console.log(`  - Transfers: ${transferCount}`);
console.log(`\nTotal (cents): ${totalCents}`);
console.log(`Total (currency): ${totalAmount.toFixed(2)}`);
console.log(`Expected balance: ${expectedBalance.toFixed(2)}`);
console.log(`Difference: ${difference.toFixed(2)}`);

if (Math.abs(difference) < 0.01) {
  console.log('\n✅ Balance matches expected value of -1500!');
  process.exit(0);
} else {
  console.log(`\n❌ Balance does NOT match expected value. Difference: ${difference.toFixed(2)}`);
  process.exit(1);
}
