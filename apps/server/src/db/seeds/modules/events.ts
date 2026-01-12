import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";

interface EventData {
  noteNumber: number;
  code: string;
  description: string;
  statementCodes: string[];
  balanceType: "DEBIT" | "CREDIT" | "BOTH";
  eventType: "REVENUE" | "EXPENSE" | "ASSET" | "LIABILITY" | "EQUITY";
  displayOrder: number;
};

const eventsData: EventData[] = [
  { noteNumber: 1, code: "TAX_REVENUE", description: "Tax revenue", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 1 },
  { noteNumber: 2, code: "GRANTS", description: "Grants", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 2 },
  { noteNumber: 3, code: "TRANSFERS_CENTRAL_TREASURY", description: "Transfers from central treasury", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 3 },
  { noteNumber: 4, code: "TRANSFERS_PUBLIC_ENTITIES", description: "Transfers from public entities", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 4 },
  { noteNumber: 5, code: "FINES_PENALTIES_LICENSES", description: "Fines, penalties, and licenses", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 5 },
  { noteNumber: 6, code: "PROPERTY_INCOME", description: "Property income", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 6 },
  { noteNumber: 7, code: "SALES_GOODS_SERVICES", description: "Sales of goods and services", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 7 },
  { noteNumber: 8, code: "PROCEEDS_SALE_CAPITAL", description: "Proceeds from sale of capital items", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 8 },
  { noteNumber: 9, code: "OTHER_REVENUE", description: "Other revenue", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 9 },
  { noteNumber: 10, code: "DOMESTIC_BORROWINGS", description: "Domestic borrowings", statementCodes: ["CASH_FLOW", "ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 10 },
  { noteNumber: 11, code: "EXTERNAL_BORROWINGS", description: "External borrowings", statementCodes: ["CASH_FLOW", "ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 11 },
  { noteNumber: 12, code: "COMPENSATION_EMPLOYEES", description: "Compensation of employees", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 12 },

  { noteNumber: 13, code: "GOODS_SERVICES", description: "Goods and services", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 13 }, // Universal event for both planning and execution

  { noteNumber: 14, code: "GRANTS_TRANSFERS", description: "Grants and transfers", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 14 },
  { noteNumber: 15, code: "SUBSIDIES", description: "Subsidies", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 15 },
  { noteNumber: 16, code: "SOCIAL_ASSISTANCE", description: "Social assistance", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 16 },
  { noteNumber: 17, code: "FINANCE_COSTS", description: "Finance costs", statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 17 },
  { noteNumber: 18, code: "ACQUISITION_FIXED_ASSETS", description: "Acquisition of fixed assets", statementCodes: ["CASH_FLOW", "BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 18 },
  { noteNumber: 19, code: "REPAYMENT_BORROWINGS", description: "Repayment of borrowings", statementCodes: ["CASH_FLOW"], balanceType: "DEBIT", eventType: "LIABILITY", displayOrder: 19 },
  { noteNumber: 20, code: "OTHER_EXPENSES", description: "Other expenses", statementCodes: ["REV_EXP", "CASH_FLOW"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 20 },
  // NOTE: CASH_EQUIVALENTS_BEGIN is populated ONLY by the carryforward service, not by event mappings
  { noteNumber: 21, code: "CASH_EQUIVALENTS_BEGIN", description: "Cash and cash equivalents at beginning of period", statementCodes: ["CASH_FLOW", "ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 21 },
  { noteNumber: 22, code: "CASH_EQUIVALENTS_END", description: "Cash and cash equivalents at end of period", statementCodes: ["CASH_FLOW", "ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 22 },
  { noteNumber: 23, code: "ADVANCE_PAYMENTS", description: "Advance payments", statementCodes: ["ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 23 },

  { noteNumber: 24, code: "DIRECT_INVESTMENTS", description: "Direct investments", statementCodes: ["ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 24 },
  { noteNumber: 25, code: "PAYABLES", description: "Payables", statementCodes: ["ASSETS_LIAB", "CASH_FLOW"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 25 },
  { noteNumber: 26, code: "PAYMENTS_RECEIVED_ADVANCE", description: "Payments received in advance", statementCodes: ["ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 26 },
  { noteNumber: 27, code: "RETAINED_PERFORMANCE_SECURITIES", description: "Retained performance securities", statementCodes: ["ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 27 },
  { noteNumber: 28, code: "DIRECT_BORROWINGS", description: "Direct borrowings", statementCodes: ["ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 28 },
  { noteNumber: 29, code: "ACCUMULATED_SURPLUS_DEFICITS", description: "Accumulated surplus/(deficits)", statementCodes: ["ASSETS_LIAB", "NET_ASSETS_CHANGES"], balanceType: "BOTH", eventType: "EQUITY", displayOrder: 29 },
  { noteNumber: 30, code: "PRIOR_YEAR_ADJUSTMENTS", description: "Prior year adjustments", statementCodes: ["CASH_FLOW", "NET_ASSETS_CHANGES"], balanceType: "BOTH", eventType: "EQUITY", displayOrder: 30 },
  { noteNumber: 31, code: "CHANGE_PAYABLES", description: "Change in payables", statementCodes: ["CASH_FLOW"], balanceType: "BOTH", eventType: "LIABILITY", displayOrder: 31 },
  { noteNumber: 32, code: "TOTAL_RECEIPTS", description: "Total receipts", statementCodes: ["BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "REVENUE", displayOrder: 32 },
  { noteNumber: 33, code: "TOTAL_PAYMENTS", description: "Total payments", statementCodes: ["BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 33 },
  { noteNumber: 34, code: "TOTAL_NON_FINANCIAL_ASSETS", description: "Total non-financial assets", statementCodes: ["BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 34 },
  { noteNumber: 35, code: "TOTAL_NET_LIABILITY_INCURRANCE", description: "Total net incurrence of liabilities", statementCodes: ["BUDGET_VS_ACTUAL"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 35 },

  { noteNumber: 36, code: "CASH_EQUIVALENTS_BEGINNING", description: "Cash and cash equivalents at beginning of period", statementCodes: ["CASH_FLOW", "ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 36 },
  { noteNumber: 37, code: "INVENTORIES", description: "Inventories", statementCodes: ["ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 37 },
  { noteNumber: 38, code: "PROPERTY_PLANT_EQUIPMENT", description: "Property, plant, and equipment", statementCodes: ["ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 38 },
  { noteNumber: 39, code: "DEPRECIATION_AMORTIZATION", description: "Depreciation and amortization", statementCodes: ["REV_EXP", "CASH_FLOW", "ASSETS_LIAB"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 39 },
  { noteNumber: 40, code: "PROVISIONS", description: "Provisions", statementCodes: ["ASSETS_LIAB"], balanceType: "CREDIT", eventType: "LIABILITY", displayOrder: 40 },
  { noteNumber: 41, code: "RECEIVABLES_NON_EXCHANGE", description: "Receivables, non-exchange", statementCodes: ["ASSETS_LIAB", "CASH_FLOW"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 41 },
  { noteNumber: 42, code: "RECEIVABLES_EXCHANGE", description: "Receivables from exchange transactions", statementCodes: ["ASSETS_LIAB"], balanceType: "DEBIT", eventType: "ASSET", displayOrder: 42 },
  { noteNumber: 43, code: "GOODS_SERVICES_PLANNING", description: "Goods and services for planning", statementCodes: ["BUDGET_VS_ACTUAL"], balanceType: "DEBIT", eventType: "EXPENSE", displayOrder: 43 }, // new ACTIVITY
  
  // Prior Year Adjustments - Granular breakdown for Net Changes in Assets statement
  { noteNumber: 44, code: "PRIOR_YEAR_ADJUSTMENTS_CASH", description: "Prior year adjustments - Cash and cash equivalent", statementCodes: ["CASH_FLOW", "NET_ASSETS_CHANGES"], balanceType: "BOTH", eventType: "EQUITY", displayOrder: 44 },
  { noteNumber: 45, code: "PRIOR_YEAR_ADJUSTMENTS_RECEIVABLES", description: "Prior year adjustments - Receivables and other financial assets", statementCodes: ["CASH_FLOW", "NET_ASSETS_CHANGES"], balanceType: "BOTH", eventType: "EQUITY", displayOrder: 45 },
  { noteNumber: 46, code: "PRIOR_YEAR_ADJUSTMENTS_PAYABLES", description: "Prior year adjustments - Payables and other liabilities", statementCodes: ["CASH_FLOW", "NET_ASSETS_CHANGES"], balanceType: "BOTH", eventType: "EQUITY", displayOrder: 46 }
];

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding events...");

  const rows = eventsData.map((e) => ({
    noteNumber: e.noteNumber,
    code: e.code,
    description: e.description,
    statementCodes: e.statementCodes,
    balanceType: e.balanceType,
    eventType: e.eventType,
    displayOrder: e.displayOrder,
  }));

  console.log(`Prepared ${rows.length} events`);
  if (rows.length === 0) {
    throw new Error("No events prepared");
  }

  const seedManager = new SeedManager(db);
  await seedManager.seedWithConflictResolution(schema.events, rows, {
    uniqueFields: ["code"],
    onConflict: "skip",
    updateFields: ["noteNumber", "description", "statementCodes", "balanceType", "eventType", "displayOrder"],
  });

  console.log(`Seeded ${eventsData.length} events.`);
}
