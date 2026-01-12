import { Database } from "@/db";
import { DataCollectionService } from "../../api/routes/financial-reports/data-collection.service";
import { 
  StatementGeneratorEngine,
  StatementFormulaEngine,
  StatementLineProcessor,
  StatementValidator
} from "./index";

export class StatementEngineFactory {
  private static instance: StatementGeneratorEngine | null = null;

  /**
   * Create or get singleton instance of StatementGeneratorEngine
   */
  static createEngine(db: Database): StatementGeneratorEngine {
    if (!this.instance) {
      // Create dependencies
      const dataCollectionService = new DataCollectionService(db);
      const formulaEngine = new StatementFormulaEngine();
      const lineProcessor = new StatementLineProcessor(formulaEngine);
      const validator = new StatementValidator();

      // Create main engine
      this.instance = new StatementGeneratorEngine(
        db,
        dataCollectionService,
        lineProcessor,
        validator
      );
    }

    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Get current instance without creating if it doesn't exist
   */
  static getInstance(): StatementGeneratorEngine | null {
    return this.instance;
  }
}