# Analytics API Documentation

## Overview

The Analytics API provides comprehensive budget execution analysis and reporting capabilities for the Budget Management System. It enables stakeholders to monitor budget performance, identify execution trends, analyze variances between planned and actual expenditures, and generate insights for decision-making across health programs (HIV, Malaria, TB) and facilities.

## Base URL
```
https://api.budget-system.com/api/analytics
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

---

## Resource Description

The **Analytics API** transforms raw budget data into actionable insights through statistical analysis, trend identification, and performance metrics. It supports various analytical dimensions including project-based analysis, facility performance comparison, category-wise spending patterns, and temporal trend analysis.

---

## Endpoints

### Budget Execution Rates

Analyze budget execution performance with configurable grouping and filtering options.

**Endpoint:** `GET /api/analytics/budget-execution-rates`

**Purpose:** Generate execution rate analytics to monitor budget performance, identify underperforming areas, and support management decision-making across health programs and facilities.

#### Query Parameters

| Parameter | Type | Required | Description | Default | Example |
|-----------|------|----------|-------------|---------|---------|
| `projectId` | integer | No | Filter by specific project/program | - | `1` |
| `facilityId` | integer | No | Filter by specific facility | - | `5` |
| `reportingPeriodId` | integer | No | Filter by reporting period | - | `2025` |
| `groupBy` | string | No | Group results by dimension | `project` | `project`, `facility`, `category`, `quarter` |
| `fromDate` | string | No | Start date filter (ISO 8601) | - | `2025-01-01T00:00:00Z` |
| `toDate` | string | No | End date filter (ISO 8601) | - | `2025-12-31T23:59:59Z` |

#### Response

**Status Code:** `200 OK`

```json
{
  "overall": {
    "planned": 1500000.00,
    "executed": 1275000.00,
    "rate": 85.0,
    "variance": -225000.00
  },
  "breakdown": [
    {
      "id": 1,
      "name": "HIV Program",
      "planned": 800000.00,
      "executed": 720000.00,
      "rate": 90.0,
      "variance": -80000.00,
      "trend": "up"
    },
    {
      "id": 2,
      "name": "TB Program",
      "planned": 400000.00,
      "executed": 300000.00,
      "rate": 75.0,
      "variance": -100000.00,
      "trend": "down"
    },
    {
      "id": 3,
      "name": "Malaria Program",
      "planned": 300000.00,
      "executed": 255000.00,
      "rate": 85.0,
      "variance": -45000.00,
      "trend": "stable"
    }
  ],
  "byQuarter": {
    "q1": {
      "planned": 375000.00,
      "executed": 350000.00,
      "rate": 93.3
    },
    "q2": {
      "planned": 375000.00,
      "executed": 320000.00,
      "rate": 85.3
    },
    "q3": {
      "planned": 375000.00,
      "executed": 310000.00,
      "rate": 82.7
    },
    "q4": {
      "planned": 375000.00,
      "executed": 295000.00,
      "rate": 78.7
    }
  }
}
```

---

## Data Models

### Overall Execution Summary

| Field | Type | Description |
|-------|------|-------------|
| `planned` | number | Total budgeted amount across all selected entities |
| `executed` | number | Total actual expenditure across all selected entities |
| `rate` | number | Overall execution rate percentage (0-100) |
| `variance` | number | Total variance (executed - planned). Negative indicates under-execution |

### Breakdown Item

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier of the entity (project/facility/category) |
| `name` | string | Display name of the entity |
| `planned` | number | Budgeted amount for this specific entity |
| `executed` | number | Actual expenditure for this specific entity |
| `rate` | number | Entity-specific execution rate percentage |
| `variance` | number | Entity budget variance (negative = under-execution) |
| `trend` | string | Performance trend indicator compared to previous period |

### Quarterly Performance

| Field | Type | Description |
|-------|------|-------------|
| `planned` | number | Quarter-specific budgeted amount |
| `executed` | number | Quarter-specific actual expenditure |
| `rate` | number | Quarter execution rate percentage |

### Trend Indicators

| Value | Description | Interpretation |
|-------|-------------|----------------|
| `up` | Execution rate improving | Performance better than previous period |
| `down` | Execution rate declining | Performance worse than previous period |
| `stable` | Execution rate unchanged | Performance consistent with previous period |

---

## Usage Examples

### 1. Program Performance Analysis

Monitor execution rates across different health programs:

```http
GET /api/analytics/budget-execution-rates?groupBy=project&fromDate=2025-01-01T00:00:00Z&toDate=2025-12-31T23:59:59Z
```

**Use Case:** Compare HIV, TB, and Malaria program execution rates to identify which programs need additional support or resource reallocation.

**Expected Insights:**
- Programs with consistently low execution rates may need capacity building
- High-performing programs can serve as best practice models
- Resource reallocation opportunities between programs

### 2. Facility Performance Comparison

Analyze execution rates by facility:

```http
GET /api/analytics/budget-execution-rates?groupBy=facility&projectId=1
```

**Use Case:** Identify hospitals and health centers with low execution rates that may need capacity building or process improvements.

**Expected Insights:**
- Facilities requiring management intervention
- Geographic patterns in performance
- Facility-specific training needs

### 3. Category-wise Spending Analysis

Break down execution by budget categories:

```http
GET /api/analytics/budget-execution-rates?groupBy=category&facilityId=5&reportingPeriodId=2025
```

**Use Case:** Determine if specific spending categories (HR, equipment, travel) are consistently under-executed across facilities.

**Expected Insights:**
- Spending categories with systemic execution issues
- Resource allocation optimization opportunities
- Category-specific process improvements needed

### 4. Quarterly Trend Analysis

Monitor execution trends over time:

```http
GET /api/analytics/budget-execution-rates?groupBy=quarter&projectId=2
```

**Use Case:** Identify seasonal patterns or declining performance that requires management intervention.

**Expected Insights:**
- Seasonal execution patterns
- Early warning indicators for annual performance
- Quarterly intervention opportunities

---

## Business Intelligence Applications

### Dashboard Visualizations

The analytics data supports comprehensive dashboard components:

#### Key Performance Indicators (KPIs)
- **Overall Execution Rate Card:** Primary metric with trend indicator
- **Total Budget Variance Card:** Absolute variance with percentage impact
- **Program Count Card:** Number of active programs being monitored
- **Alert Status Card:** Count of programs/facilities requiring attention

#### Charts and Graphs
1. **Horizontal Bar Chart:** Execution rates by program/facility/category
2. **Line Chart:** Quarterly execution trends with target benchmarks
3. **Heat Map:** Facility performance matrix (facility vs. program)
4. **Donut Chart:** Budget allocation vs. execution distribution
5. **Scatter Plot:** Budget size vs. execution rate correlation

### Alerting and Monitoring

Configure automated alerts based on analytics thresholds:

#### Performance Alerts
- **Critical Low Execution:** Rate below 60% (Red alert)
- **Warning Low Execution:** Rate below 75% (Yellow alert)
- **High Variance Alert:** Variance exceeding ±20% (Orange alert)
- **Declining Trend Alert:** Three consecutive periods of decline (Purple alert)

#### Notification Channels
- Email alerts to program managers
- Dashboard notifications for facility administrators
- SMS alerts for critical performance issues
- Slack/Teams integration for management teams

### Performance Reporting

Generate automated reports for various stakeholders:

#### Executive Reports
- **Monthly Executive Summary:** High-level performance overview
- **Quarterly Board Report:** Comprehensive analysis with recommendations
- **Annual Performance Assessment:** Complete fiscal year evaluation

#### Operational Reports
- **Weekly Facility Performance:** Detailed facility-level analytics
- **Monthly Program Review:** Program-specific execution analysis
- **Category Spending Report:** Category-wise expenditure patterns

#### Compliance Reports
- **Donor Reporting:** Execution rates formatted for donor requirements
- **Government Submissions:** Ministry of Health reporting standards
- **Audit Documentation:** Detailed variance explanations and supporting data

---

## Error Handling

### Invalid Parameters (400)
```json
{
  "error": "Invalid Parameter",
  "message": "groupBy parameter must be one of: project, facility, category, quarter",
  "validValues": ["project", "facility", "category", "quarter"]
}
```

### No Data Found (404)
```json
{
  "message": "No budget execution data found for the specified criteria",
  "suggestion": "Try adjusting the date range or removing specific filters"
}
```

### Date Range Error (400)
```json
{
  "error": "Invalid Date Range",
  "message": "fromDate must be earlier than toDate",
  "provided": {
    "fromDate": "2025-12-31T00:00:00Z",
    "toDate": "2025-01-01T00:00:00Z"
  }
}
```

### Insufficient Permissions (403)
```json
{
  "error": "Access Denied",
  "message": "User does not have permission to view analytics for the specified project",
  "requiredRole": "project_viewer"
}
```

---

## Performance Considerations

### Caching Strategy
- **Query Results:** Cache execution rate calculations for 1 hour
- **Aggregations:** Pre-compute common groupings during off-peak hours
- **Trending Data:** Update trend indicators once daily

### Data Freshness
- **Real-time Updates:** Not available due to calculation complexity
- **Batch Updates:** Data refreshed every 4 hours during business hours
- **Manual Refresh:** Available via admin interface for urgent needs

### Response Time Optimization
- **Large Datasets:** Implement pagination for breakdown arrays exceeding 100 items
- **Complex Queries:** Provide estimated response time in headers
- **Timeout Handling:** Maximum query execution time of 30 seconds

---

## Integration Examples

### React Dashboard Component

```javascript
const BudgetExecutionDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  
  useEffect(() => {
    fetchAnalytics({
      groupBy: 'project',
      fromDate: '2025-01-01T00:00:00Z',
      toDate: '2025-12-31T23:59:59Z'
    }).then(setAnalyticsData);
  }, []);

  return (
    <div>
      <KPICard 
        title="Overall Execution Rate"
        value={analyticsData?.overall.rate}
        trend={getTrend(analyticsData?.overall)}
      />
      <ExecutionChart data={analyticsData?.breakdown} />
      <QuarterlyTrend data={analyticsData?.byQuarter} />
    </div>
  );
};
```

### Python Data Analysis

```python
import requests
import pandas as pd

def analyze_program_performance(api_key, project_ids):
    headers = {'Authorization': f'Bearer {api_key}'}
    
    results = []
    for project_id in project_ids:
        response = requests.get(
            f'/api/analytics/budget-execution-rates',
            params={'projectId': project_id, 'groupBy': 'quarter'},
            headers=headers
        )
        results.append(response.json())
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame([
        {
            'project_id': pid,
            'q1_rate': data['byQuarter']['q1']['rate'],
            'q2_rate': data['byQuarter']['q2']['rate'],
            'q3_rate': data['byQuarter']['q3']['rate'],
            'q4_rate': data['byQuarter']['q4']['rate'],
            'overall_rate': data['overall']['rate']
        }
        for pid, data in zip(project_ids, results)
    ])
    
    return df
```

---

## Analytics Benefits

The Analytics API transforms the budget management system by providing:

### Strategic Decision Support
- **Resource Optimization:** Identify programs and facilities for resource reallocation
- **Performance Benchmarking:** Compare execution rates across similar entities
- **Predictive Insights:** Early identification of potential budget shortfalls
- **Investment Prioritization:** Data-driven program funding decisions

### Operational Excellence
- **Exception Management:** Focus attention on underperforming areas
- **Process Improvement:** Identify systematic execution bottlenecks
- **Capacity Planning:** Understand facility-specific execution capabilities
- **Performance Coaching:** Support targeted interventions for improvement

### Compliance and Accountability
- **Donor Reporting:** Automated generation of execution rate reports
- **Government Standards:** Compliance with Ministry of Health requirements
- **Audit Readiness:** Comprehensive variance analysis and documentation
- **Transparency:** Clear visibility into budget performance for all stakeholders

### Financial Management
- **Variance Analysis:** Detailed understanding of budget vs. actual performance
- **Cash Flow Planning:** Improved forecasting based on execution patterns
- **Risk Management:** Early warning systems for budget overruns or under-execution
- **Cost Control:** Identification of spending pattern anomalies

The Analytics API enables evidence-based budget management, transforming raw financial data into strategic insights that drive improved health program outcomes and fiscal responsibility.