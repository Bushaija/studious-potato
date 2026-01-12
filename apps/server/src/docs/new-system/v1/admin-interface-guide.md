// ===================================
// ADMIN INTERFACE IMPLEMENTATION GUIDE
// Schema Management Dashboard Components
// ===================================

import React, { useState, useEffect } from 'react';
import { 
  FormSchemaDefinition, 
  DynamicActivity, 
  ActivityCategory,
  ValidationRule 
} from './types';

// ===================================
// 1. MAIN SCHEMA MANAGEMENT DASHBOARD
// ===================================

const SchemaManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schemas' | 'activities' | 'mappings' | 'validation'>('schemas');
  
  return (
    <div className="schema-dashboard">
      <div className="dashboard-header">
        <h1>System Configuration</h1>
        <div className="tab-navigation">
          <button 
            className={activeTab === 'schemas' ? 'active' : ''}
            onClick={() => setActiveTab('schemas')}
          >
            Form Schemas
          </button>
          <button 
            className={activeTab === 'activities' ? 'active' : ''}
            onClick={() => setActiveTab('activities')}
          >
            Activities & Categories  
          </button>
          <button 
            className={activeTab === 'mappings' ? 'active' : ''}
            onClick={() => setActiveTab('mappings')}
          >
            Event Mappings
          </button>
          <button 
            className={activeTab === 'validation' ? 'active' : ''}
            onClick={() => setActiveTab('validation')}
          >
            Validation Rules
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'schemas' && <FormSchemaManager />}
        {activeTab === 'activities' && <ActivityManager />}
        {activeTab === 'mappings' && <EventMappingManager />}
        {activeTab === 'validation' && <ValidationRuleManager />}
      </div>
    </div>
  );
};

// ===================================
// 2. FORM SCHEMA MANAGER
// ===================================

const FormSchemaManager: React.FC = () => {
  const [schemas, setSchemas] = useState<FormSchemaDefinition[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<FormSchemaDefinition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: schemaList, isLo