import { db } from "@/db";
import { statementTemplates } from "@/db/schema";

async function seedMinimalRevExp() {
  console.log("Seeding minimal REV_EXP template...");

  try {
    // Check if template already exists
    const existing = await db.query.statementTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.statementCode, "REV_EXP"),
    });

    if (existing) {
      console.log("REV_EXP template already exists, skipping...");
      return;
    }

    // Create minimal REV_EXP template
    const templateData = [
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "1. REVENUES",
        lineCode: "REVENUES",
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
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Tax revenue",
        lineCode: "TAX_REVENUE",
        parentLineId: null,
        displayOrder: 2,
        level: 2,
        eventMappings: [],
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
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "2. EXPENSES",
        lineCode: "EXPENSES",
        parentLineId: null,
        displayOrder: 3,
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
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "Goods and services",
        lineCode: "GOODS_SERVICES",
        parentLineId: null,
        displayOrder: 4,
        level: 2,
        eventMappings: [],
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
      {
        statementCode: "REV_EXP",
        statementName: "Statement of Revenue and Expenditure",
        lineItem: "3. SURPLUS / (DEFICIT) FOR THE PERIOD",
        lineCode: "SURPLUS_DEFICIT",
        parentLineId: null,
        displayOrder: 5,
        level: 1,
        eventMappings: [],
        calculationFormula: "REVENUES - EXPENSES",
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

    // Insert template rows
    await db.insert(statementTemplates).values(templateData);
    
    console.log(`✅ Successfully seeded ${templateData.length} REV_EXP template rows`);
    
  } catch (error) {
    console.error("❌ Error seeding REV_EXP template:", error);
    throw error;
  }
}

// Run the seeder
seedMinimalRevExp()
  .then(() => {
    console.log("🎉 REV_EXP template seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 REV_EXP template seeding failed:", error);
    process.exit(1);
  });