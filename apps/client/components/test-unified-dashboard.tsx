/**
 * Test Component for Unified Dashboard Hook
 * 
 * This component demonstrates and tests the useDashboard hook
 * with various component combinations and filters.
 * 
 * Example usage:
 * - Filter by project type: projectType: 'HIV'
 * - Filter by scope: scope: 'district', scopeId: 1
 * - Filter by quarter: quarter: 1
 * - Combine filters: { scope: 'province', scopeId: 2, projectType: 'Malaria', quarter: 2 }
 */

'use client';

import { useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard';
import type { DashboardComponent, DashboardScope } from '@/types/dashboard';

export function TestUnifiedDashboard() {
  const [selectedComponents, setSelectedComponents] = useState<DashboardComponent[]>([
    'metrics',
    'programDistribution',
  ]);
  const [scope, setScope] = useState<DashboardScope>('district');
  const [scopeId, setScopeId] = useState<number>(1);
  const [projectType, setProjectType] = useState<'HIV' | 'Malaria' | 'TB' | undefined>(undefined);
  const [quarter, setQuarter] = useState<number | undefined>(undefined);

  const { data, isLoading, error, refetch } = useDashboard({
    components: selectedComponents,
    filters: {
      scope,
      scopeId,
      projectType,
      quarter,
    },
  });

  const allComponents: DashboardComponent[] = [
    'metrics',
    'programDistribution',
    'budgetByDistrict',
    'budgetByFacility',
    'provinceApprovals',
    'districtApprovals',
    'tasks',
  ];

  const toggleComponent = (component: DashboardComponent) => {
    setSelectedComponents((prev) =>
      prev.includes(component)
        ? prev.filter((c) => c !== component)
        : [...prev, component]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Unified Dashboard Hook Test</h1>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>

        {/* Component Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Components:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {allComponents.map((component) => (
              <label key={component} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedComponents.includes(component)}
                  onChange={() => toggleComponent(component)}
                  className="rounded"
                />
                <span className="text-sm">{component}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Scope:</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as DashboardScope)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="country">Country</option>
              <option value="province">Province</option>
              <option value="district">District</option>
              <option value="facility">Facility</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Scope ID:</label>
            <input
              type="number"
              value={scopeId}
              onChange={(e) => setScopeId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Project Type (optional):
            </label>
            <select
              value={projectType || ''}
              onChange={(e) =>
                setProjectType(e.target.value ? (e.target.value as 'HIV' | 'Malaria' | 'TB') : undefined)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Programs</option>
              <option value="HIV">HIV</option>
              <option value="Malaria">Malaria</option>
              <option value="TB">TB</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quarter (optional):
            </label>
            <select
              value={quarter || ''}
              onChange={(e) =>
                setQuarter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All quarters</option>
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refetch Data
        </button>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Loading:</span>{' '}
            <span className={isLoading ? 'text-yellow-600' : 'text-green-600'}>
              {isLoading ? 'Yes' : 'No'}
            </span>
          </p>
          <p>
            <span className="font-medium">Error:</span>{' '}
            {error ? (
              <span className="text-red-600">{error.message}</span>
            ) : (
              <span className="text-green-600">None</span>
            )}
          </p>
          <p>
            <span className="font-medium">Components Requested:</span>{' '}
            {selectedComponents.length}
          </p>
          <p>
            <span className="font-medium">Active Filters:</span>{' '}
            <span className="text-blue-600">
              {scope} (ID: {scopeId})
              {projectType && ` | Project Type: ${projectType}`}
              {quarter && ` | Quarter: Q${quarter}`}
            </span>
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Response Data</h2>
        
        {isLoading && (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-4">
            {/* Metrics */}
            {data.metrics && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Metrics</h3>
                {data.metrics.error ? (
                  <p className="text-red-600">Error: {data.metrics.message}</p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.metrics.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Program Distribution */}
            {data.programDistribution && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Program Distribution</h3>
                {data.programDistribution.error ? (
                  <p className="text-red-600">
                    Error: {data.programDistribution.message}
                  </p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.programDistribution.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Budget by District */}
            {data.budgetByDistrict && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Budget by District</h3>
                {data.budgetByDistrict.error ? (
                  <p className="text-red-600">
                    Error: {data.budgetByDistrict.message}
                  </p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.budgetByDistrict.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Budget by Facility */}
            {data.budgetByFacility && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Budget by Facility</h3>
                {data.budgetByFacility.error ? (
                  <p className="text-red-600">
                    Error: {data.budgetByFacility.message}
                  </p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.budgetByFacility.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Province Approvals */}
            {data.provinceApprovals && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Province Approvals</h3>
                {data.provinceApprovals.error ? (
                  <p className="text-red-600">
                    Error: {data.provinceApprovals.message}
                  </p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.provinceApprovals.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* District Approvals */}
            {data.districtApprovals && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">District Approvals</h3>
                {data.districtApprovals.error ? (
                  <p className="text-red-600">
                    Error: {data.districtApprovals.message}
                  </p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.districtApprovals.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Tasks */}
            {data.tasks && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Tasks</h3>
                {data.tasks.error ? (
                  <p className="text-red-600">Error: {data.tasks.message}</p>
                ) : (
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(data.tasks.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
