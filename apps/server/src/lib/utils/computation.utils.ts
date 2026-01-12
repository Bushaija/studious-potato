export class FormulaEngine {
    // Safe math functions that can be used in formulas
    private safeFunctions = {
      ABS: Math.abs,
      ROUND: (num: number, digits = 0) => Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits),
      CEIL: Math.ceil,
      FLOOR: Math.floor,
      MAX: Math.max,
      MIN: Math.min,
      SUM: (...args: number[]) => args.reduce((sum, val) => sum + (val || 0), 0),
      AVERAGE: (...args: number[]) => args.length > 0 ? args.reduce((sum, val) => sum + (val || 0), 0) / args.length : 0,
      SAFEDIV: (dividend: number, divisor: number, defaultValue = 0) => divisor !== 0 ? dividend / divisor : defaultValue,
      IF: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
      PERCENTAGE: (value: number, total: number) => total !== 0 ? (value / total) * 100 : 0
    };
  
    parseFormula(formula: string) {
      const result = {
        isValid: true,
        errors: [] as string[]
      };
  
      try {
        // Basic syntax checks
        const openParens = (formula.match(/\(/g) || []).length;
        const closeParens = (formula.match(/\)/g) || []).length;
        
        if (openParens !== closeParens) {
          result.isValid = false;
          result.errors.push("Mismatched parentheses");
        }
  
        // Check for invalid characters
        const invalidChars = formula.match(/[^a-zA-Z0-9\s\+\-\*\/\(\)\.\,\_\>\<\=\!\&\|]/g);
        if (invalidChars) {
          result.isValid = false;
          result.errors.push(`Invalid characters: ${invalidChars.join(', ')}`);
        }
  
        return result;
      } catch (error) {
        result.isValid = false;
        result.errors.push(error instanceof Error ? error.message : "Parse error");
        return result;
      }
    }
  
    async evaluate(formula: string, context: Record<string, any>): Promise<any> {
      try {
        // Replace field references with actual values
        let processedFormula = formula;
        
        // Replace function calls
        Object.entries(this.safeFunctions).forEach(([name, func]) => {
          const regex = new RegExp(`\\b${name}\\s*\\(([^)]*)\\)`, 'gi');
          processedFormula = processedFormula.replace(regex, (match, args) => {
            const argValues = args.split(',').map((arg: string) => {
              const trimmed = arg.trim();
              if (context.hasOwnProperty(trimmed)) {
                return context[trimmed];
              }
              return isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
            });
            return String((func as any)(...argValues));
          });
        });
  
        // Replace field references
        Object.entries(context).forEach(([key, value]) => {
          const regex = new RegExp(`\\b${key}\\b`, 'g');
          processedFormula = processedFormula.replace(regex, String(value || 0));
        });
  
        // Evaluate the final expression using Function constructor (be careful in production!)
        // In production, you'd want to use a proper expression parser for security
        const result = new Function('return ' + processedFormula)();
        return result;
      } catch (error) {
        throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    extractDependencies(formula: string): string[] {
      // Extract field references (variables) from formula
      const fieldPattern = /\b([a-zA-Z][a-zA-Z0-9_]*)\b/g;
      const matches = formula.match(fieldPattern) || [];
      
      // Filter out function names and keywords
      const functionNames = Object.keys(this.safeFunctions);
      const keywords = ['true', 'false', 'null', 'undefined', 'if', 'else'];
      
      const dependencies = matches.filter(match => 
        !functionNames.includes(match.toUpperCase()) &&
        !keywords.includes(match.toLowerCase()) &&
        isNaN(Number(match))
      );
  
      return [...new Set(dependencies)]; // Remove duplicates
    }
  
    extractInputs(formula: string, data: Record<string, any>): Record<string, any> {
      const dependencies = this.extractDependencies(formula);
      const inputs: Record<string, any> = {};
      
      dependencies.forEach(dep => {
        inputs[dep] = data[dep];
      });
      
      return inputs;
    }
  
    analyzeComplexity(formula: string): { score: number; factors: string[] } {
      const factors = [];
      let score = 1;
  
      // Count operators
      const operators = formula.match(/[\+\-\*\/\>\<\=\!\&\|]/g) || [];
      score += operators.length * 0.5;
      if (operators.length > 10) factors.push("High operator count");
  
      // Count function calls
      const functions = formula.match(/\b[A-Z]+\s*\(/g) || [];
      score += functions.length;
      if (functions.length > 5) factors.push("Many function calls");
  
      // Count nested parentheses
      let maxNesting = 0;
      let currentNesting = 0;
      for (const char of formula) {
        if (char === '(') currentNesting++;
        else if (char === ')') currentNesting--;
        maxNesting = Math.max(maxNesting, currentNesting);
      }
      score += maxNesting;
      if (maxNesting > 3) factors.push("Deep nesting");
  
      // Count field references
      const dependencies = this.extractDependencies(formula);
      score += dependencies.length * 0.3;
      if (dependencies.length > 10) factors.push("Many field dependencies");
  
      return { score, factors };
    }
  
    async suggestOptimizations(formula: string, goals: string[]) {
      const suggestions = [];
      const complexity = this.analyzeComplexity(formula);
  
      // Performance optimizations
      if (goals.includes('performance')) {
        if (formula.includes('AVERAGE') && formula.includes('SUM')) {
          suggestions.push({
            optimizedFormula: formula.replace(/AVERAGE\(([^)]+)\)/g, 'SUM($1) / COUNT($1)'),
            type: 'performance',
            performanceGain: 0.1,
            risks: ['Slightly more complex formula']
          });
        }
  
        if (complexity.score > 10) {
          suggestions.push({
            optimizedFormula: '// Consider breaking into smaller sub-calculations',
            type: 'performance',
            performanceGain: 0.3,
            risks: ['Requires restructuring']
          });
        }
      }
  
      // Accuracy optimizations
      if (goals.includes('accuracy')) {
        if (formula.includes('/') && !formula.includes('SAFEDIV')) {
          suggestions.push({
            optimizedFormula: formula.replace(/(\w+)\s*\/\s*(\w+)/g, 'SAFEDIV($1, $2)'),
            type: 'accuracy',
            performanceGain: 0.05,
            risks: ['Changes default behavior for division by zero']
          });
        }
      }
  
      return suggestions;
    }
  }
  
  export const formulaEngine = new FormulaEngine();