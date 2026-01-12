// Configuration loader for statement templates
// This allows us to load statement configurations from JSON files
// instead of hardcoding them in TypeScript files

import { ColumnDefinition, ValidationRule, StatementMetadata } from '../types';

export interface StatementConfiguration {
  statementCode: string;
  statementName: string;
  columns: ColumnDefinition[];
  validationRules: ValidationRule[];
  statementMetadata: StatementMetadata;
}

export class StatementConfigurationLoader {
  private static configurations: Map<string, StatementConfiguration> = new Map();

  static async loadConfiguration(statementCode: string): Promise<StatementConfiguration | null> {
    // Check if already loaded
    if (this.configurations.has(statementCode)) {
      return this.configurations.get(statementCode)!;
    }

    try {
      // Load from JSON configuration file
      const configPath = `./configurations/${statementCode.toLowerCase().replace('_', '-')}.json`;
      const config = await import(configPath);
      
      // Cache the configuration
      this.configurations.set(statementCode, config.default);
      return config.default;
    } catch (error) {
      console.warn(`Failed to load configuration for ${statementCode}:`, error);
      return null;
    }
  }

  static getLoadedConfiguration(statementCode: string): StatementConfiguration | null {
    return this.configurations.get(statementCode) || null;
  }

  static clearCache(): void {
    this.configurations.clear();
  }

  static getAllLoadedConfigurations(): StatementConfiguration[] {
    return Array.from(this.configurations.values());
  }
}

// Example usage:
// const config = await StatementConfigurationLoader.loadConfiguration('REV_EXP');
// const columns = config?.columns;
// const validationRules = config?.validationRules;
