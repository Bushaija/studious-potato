import { db } from "@/db";
import { statementTemplates } from "@/db/schema";

async function seedRevExpTemplate() {
  console.log("Seeding REV_EXP statement template...");

  try {
    // Check if template already exists
    const existing = await db.query.statementTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.statementCode, "REV_EXP"),
    });

    if (existing) {
      console.log("REV_EXP template already exists, skipping...");
      return;
    }

    // Create the REV_EXP statement template
    const templateData = [
      // Header
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "STATEMENT_HEADER",
        lineCode: "HEADER",
        parentLineId: null,
        displayOrder: 0,
        level: 0,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [
          {
            columnCode: "DESCRIPTION",
            columnName: "Description",
            dataType: "TEXT",
            source: "STATIC",
            displayOrder: 1,
            isVisible: true
          },
          {
            columnCode: "NOTE",
            columnName: "Note",
            dataType: "NUMBER",
            source: "STATIC",
            displayOrder: 2,
            isVisible: true
          },
          {
            columnCode: "CURRENT_FY",
            columnName: "FY 2025/2026 (FRW)",
            dataType: "CURRENCY",
            source: "CURRENT_PERIOD",
            format: {
              currencySymbol: "FRW",
              decimalPlaces: 0,
              showZeroAs: "-"
            },
            displayOrder: 3,
            isVisible: true
          },
          {
            columnCode: "PRIOR_FY",
            columnName: "FY 2024/2025 (FRW)",
            dataType: "CURRENCY",
            source: "PRIOR_PERIOD",
            format: {
              currencySymbol: "FRW",
              decimalPlaces: 0,
              showZeroAs: "-"
            },
            displayOrder: 4,
            isVisible: true
          }
        ],
        validationRules: [],
        statementMetadata: {
          statementType: "REVENUE_EXPENDITURE",
          currency: "FRW",
          fiscalYearFormat: "YYYY/YYYY"
        },
        metadata: {},
        isActive: true
      },
      
      // 1. REVENUES
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "1. REVENUES",
        lineCode: "REVENUES_HEADER",
        parentLineId: null,
        displayOrder: 1,
        level: 1,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // 1.1 Revenue from non-exchange
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "1.1 Revenue from non-exchange",
        lineCode: "REVENUE_NON_EXCHANGE_HEADER",
        parentLineId: null,
        displayOrder: 2,
        level: 2,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // Tax revenue
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Tax revenue",
        lineCode: "TAX_REVENUE",
        parentLineId: null,
        displayOrder: 3,
        level: 3,
        eventMappings: ["TAX_REVENUE"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 1 },
        isActive: true
      },
      
      // Grants
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Grants",
        lineCode: "GRANTS",
        parentLineId: null,
        displayOrder: 4,
        level: 3,
        eventMappings: ["GRANTS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 2 },
        isActive: true
      },
      
      // Transfers from central treasury
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Transfers from central treasury",
        lineCode: "TRANSFERS_CENTRAL",
        parentLineId: null,
        displayOrder: 5,
        level: 3,
        eventMappings: ["TRANSFERS_CENTRAL"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 3 },
        isActive: true
      },
      
      // Transfers from public entities
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Transfers from public entities",
        lineCode: "TRANSFERS_PUBLIC",
        parentLineId: null,
        displayOrder: 6,
        level: 3,
        eventMappings: ["TRANSFERS_PUBLIC"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 4 },
        isActive: true
      },
      
      // Fines, penalties and licences
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Fines, penalties and licences",
        lineCode: "FINES_PENALTIES",
        parentLineId: null,
        displayOrder: 7,
        level: 3,
        eventMappings: ["FINES_PENALTIES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 5 },
        isActive: true
      },
      
      // 1.2 Revenue from exchange transactions
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "1.2 Revenue from exchange transactions",
        lineCode: "REVENUE_EXCHANGE_HEADER",
        parentLineId: null,
        displayOrder: 8,
        level: 2,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // Property income
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Property income",
        lineCode: "PROPERTY_INCOME",
        parentLineId: null,
        displayOrder: 9,
        level: 3,
        eventMappings: ["PROPERTY_INCOME"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 6 },
        isActive: true
      },
      
      // Sales of goods and services
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Sales of goods and services",
        lineCode: "SALES_GOODS_SERVICES",
        parentLineId: null,
        displayOrder: 10,
        level: 3,
        eventMappings: ["SALES_GOODS_SERVICES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 7 },
        isActive: true
      },
      
      // Proceeds from sale of capital items
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Proceeds from sale of capital items",
        lineCode: "SALE_CAPITAL_ITEMS",
        parentLineId: null,
        displayOrder: 11,
        level: 3,
        eventMappings: ["SALE_CAPITAL_ITEMS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 8 },
        isActive: true
      },
      
      // Other revenue
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Other revenue",
        lineCode: "OTHER_REVENUE",
        parentLineId: null,
        displayOrder: 12,
        level: 3,
        eventMappings: ["OTHER_REVENUE"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 9 },
        isActive: true
      },
      
      // 1.3 Borrowings
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "1.3 Borrowings",
        lineCode: "BORROWINGS_HEADER",
        parentLineId: null,
        displayOrder: 13,
        level: 2,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // Domestic borrowings
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Domestic borrowings",
        lineCode: "DOMESTIC_BORROWINGS",
        parentLineId: null,
        displayOrder: 14,
        level: 3,
        eventMappings: ["DOMESTIC_BORROWINGS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 10 },
        isActive: true
      },
      
      // External borrowings
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "External borrowings",
        lineCode: "EXTERNAL_BORROWINGS",
        parentLineId: null,
        displayOrder: 15,
        level: 3,
        eventMappings: ["EXTERNAL_BORROWINGS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 11 },
        isActive: true
      },
      
      // TOTAL REVENUE
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "TOTAL REVENUE",
        lineCode: "TOTAL_REVENUE",
        parentLineId: null,
        displayOrder: 16,
        level: 1,
        eventMappings: [],
        calculationFormula: "SUM(TAX_REVENUE, GRANTS, TRANSFERS_CENTRAL, TRANSFERS_PUBLIC, FINES_PENALTIES, PROPERTY_INCOME, SALES_GOODS_SERVICES, SALE_CAPITAL_ITEMS, OTHER_REVENUE, DOMESTIC_BORROWINGS, EXTERNAL_BORROWINGS)",
        aggregationMethod: "SUM",
        isTotalLine: true,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // 2. EXPENSES
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "2. EXPENSES",
        lineCode: "EXPENSES_HEADER",
        parentLineId: null,
        displayOrder: 17,
        level: 1,
        eventMappings: [],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // Compensation of employees
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Compensation of employees",
        lineCode: "COMPENSATION_EMPLOYEES",
        parentLineId: null,
        displayOrder: 18,
        level: 2,
        eventMappings: ["COMPENSATION_EMPLOYEES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 12 },
        isActive: true
      },
      
      // Goods and services
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Goods and services",
        lineCode: "GOODS_SERVICES",
        parentLineId: null,
        displayOrder: 19,
        level: 2,
        eventMappings: ["GOODS_SERVICES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 13 },
        isActive: true
      },
      
      // Grants and other transfers
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Grants and other transfers",
        lineCode: "GRANTS_TRANSFERS",
        parentLineId: null,
        displayOrder: 20,
        level: 2,
        eventMappings: ["GRANTS_TRANSFERS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 14 },
        isActive: true
      },
      
      // Subsidies
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Subsidies",
        lineCode: "SUBSIDIES",
        parentLineId: null,
        displayOrder: 21,
        level: 2,
        eventMappings: ["SUBSIDIES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 15 },
        isActive: true
      },
      
      // Social assistance
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Social assistance",
        lineCode: "SOCIAL_ASSISTANCE",
        parentLineId: null,
        displayOrder: 22,
        level: 2,
        eventMappings: ["SOCIAL_ASSISTANCE"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 16 },
        isActive: true
      },
      
      // Finance costs
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Finance costs",
        lineCode: "FINANCE_COSTS",
        parentLineId: null,
        displayOrder: 23,
        level: 2,
        eventMappings: ["FINANCE_COSTS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 17 },
        isActive: true
      },
      
      // Acquisition of fixed assets
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Acquisition of fixed assets",
        lineCode: "ACQUISITION_FIXED_ASSETS",
        parentLineId: null,
        displayOrder: 24,
        level: 2,
        eventMappings: ["ACQUISITION_FIXED_ASSETS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 18 },
        isActive: true
      },
      
      // Repayment of borrowings
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Repayment of borrowings",
        lineCode: "REPAYMENT_BORROWINGS",
        parentLineId: null,
        displayOrder: 25,
        level: 2,
        eventMappings: ["REPAYMENT_BORROWINGS"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 19 },
        isActive: true
      },
      
      // Other expenses
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Other expenses",
        lineCode: "OTHER_EXPENSES",
        parentLineId: null,
        displayOrder: 26,
        level: 2,
        eventMappings: ["OTHER_EXPENSES"],
        calculationFormula: null,
        aggregationMethod: "SUM",
        isTotalLine: false,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: {},
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: { note: 20 },
        isActive: true
      },
      
      // TOTAL EXPENSES
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "TOTAL EXPENSES",
        lineCode: "TOTAL_EXPENSES",
        parentLineId: null,
        displayOrder: 27,
        level: 1,
        eventMappings: [],
        calculationFormula: "SUM(COMPENSATION_EMPLOYEES, GOODS_SERVICES, GRANTS_TRANSFERS, SUBSIDIES, SOCIAL_ASSISTANCE, FINANCE_COSTS, ACQUISITION_FIXED_ASSETS, REPAYMENT_BORROWINGS, OTHER_EXPENSES)",
        aggregationMethod: "SUM",
        isTotalLine: true,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      },
      
      // 3. SURPLUS / (DEFICIT) FOR THE PERIOD
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "3. SURPLUS / (DEFICIT) FOR THE PERIOD",
        lineCode: "SURPLUS_DEFICIT",
        parentLineId: null,
        displayOrder: 28,
        level: 1,
        eventMappings: [],
        calculationFormula: "TOTAL_REVENUE - TOTAL_EXPENSES",
        aggregationMethod: "DIFF",
        isTotalLine: true,
        isSubtotalLine: false,
        displayConditions: {},
        formatRules: { bold: true },
        columns: [],
        validationRules: [],
        statementMetadata: {},
        metadata: {},
        isActive: true
      }
    ];

    // Insert all template rows
    await db.insert(statementTemplates).values(templateData);
    
    console.log(`✅ Successfully seeded ${templateData.length} REV_EXP statement template rows`);
    
  } catch (error) {
    console.error("❌ Error seeding REV_EXP template:", error);
    throw error;
  }
}

// Run the seeder
seedRevExpTemplate()
  .then(() => {
    console.log("🎉 REV_EXP template seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 REV_EXP template seeding failed:", error);
    process.exit(1);
  });