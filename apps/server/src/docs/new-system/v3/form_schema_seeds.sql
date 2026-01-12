-- =================================================================
-- Form Schema Seeding for Planning Module
-- Database Schema-Driven Approach
-- =================================================================

-- 1. HIV Health Center Planning Form Schema
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'HIV Health Center Planning Form',
  '1.0',
  'HIV',
  'health_center',
  'planning',
  '{
    "formId": "hiv_hc_planning",
    "title": "HIV Health Center Planning",
    "version": "1.0",
    "description": "Annual planning form for HIV activities at health center level with quarterly breakdown",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Staff salaries and bonuses",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "hc_nurse_a1_salary",
            "name": "HC Nurses (A1) Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "hc_lab_tech_a1_salary", 
            "name": "HC Lab Technician (A1) Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "bonus_all_staff",
            "name": "Bonus (All staff paid on GF)",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": true
          }
        ]
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)", 
        "description": "Travel, supervision, and transportation costs",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "workshop",
            "name": "Workshop",
            "description": "Conduct support group meeting at Health Facilities especially for adolescents and children",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_chws",
            "name": "Supervision (CHWs)",
            "description": "Conduct supervision from Health centers to CHWs",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_home_visit",
            "name": "Supervision (Home Visit)",
            "description": "Conduct home visit for lost to follow up",
            "isAnnualOnly": false
          },
          {
            "code": "transport",
            "name": "Transport",
            "description": "Conduct sample transportation from Health centers to District Hospitals",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment maintenance and infrastructure",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "maintenance_repair",
            "name": "Maintenance and Repair",
            "description": "Support to DHs and HCs to improve and maintain infrastructure standards",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "pa_section",
        "title": "Program Administration Costs (PA)",
        "description": "Administrative and operational costs",
        "order": 4,
        "categoryCode": "PA",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "communication",
            "name": "Communication",
            "description": "Provide running costs for DHs & HCs",
            "isAnnualOnly": false
          },
          {
            "code": "office_supplies",
            "name": "Office Supplies",
            "description": "Provide running costs for DHs & HCs",
            "isAnnualOnly": false
          },
          {
            "code": "transport_mission_reporting",
            "name": "Transport (Mission & Reporting Fee)",
            "description": "Provide running costs for DHs & HCs",
            "isAnnualOnly": false
          },
          {
            "code": "bank_charges",
            "name": "Bank charges",
            "description": "Provide running costs for DHs & HCs",
            "isAnnualOnly": false
          }
        ]
      }
    ],
    "commonFields": {
      "frequency": {
        "type": "number",
        "label": "Frequency",
        "required": true,
        "min": 0,
        "step": 1
      },
      "unit_cost": {
        "type": "currency",
        "label": "Unit Cost (RWF)",
        "required": true,
        "min": 0
      },
      "count_q1": {
        "type": "number",
        "label": "Count Q1",
        "required": true,
        "min": 0
      },
      "count_q2": {
        "type": "number",
        "label": "Count Q2", 
        "required": true,
        "min": 0
      },
      "count_q3": {
        "type": "number",
        "label": "Count Q3",
        "required": true,
        "min": 0
      },
      "count_q4": {
        "type": "number",
        "label": "Count Q4",
        "required": true,
        "min": 0
      },
      "comment": {
        "type": "textarea",
        "label": "Comment",
        "required": false
      }
    },
    "calculations": {
      "amount_q1": "frequency * unit_cost * count_q1",
      "amount_q2": "frequency * unit_cost * count_q2", 
      "amount_q3": "frequency * unit_cost * count_q3",
      "amount_q4": "frequency * unit_cost * count_q4",
      "total": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    }
  }'::jsonb,
  1
);

-- 2. HIV Hospital Planning Form Schema
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'HIV Hospital Planning Form',
  '1.0',
  'HIV',
  'hospital',
  'planning',
  '{
    "formId": "hiv_hospital_planning",
    "title": "HIV Hospital Planning",
    "version": "1.0",
    "description": "Annual planning form for HIV activities at hospital level with quarterly breakdown",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Medical staff salaries and bonuses",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "dh_medical_dr_salary",
            "name": "DH Medical Dr. Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "senior_medical_dr_salary",
            "name": "Senior Medical Dr. Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "chief_medical_dr_salary",
            "name": "Chief Medical Dr. Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "junior_medical_dr_mentor_salary",
            "name": "Junior Medical Dr. or Mentor Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "pharmacist_salary",
            "name": "Pharmacist Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "nurse_salary",
            "name": "Nurse Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "chw_supervisor_salary",
            "name": "CHW supervisor Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "accountant_salary",
            "name": "Accountant Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs)",
            "isAnnualOnly": false
          },
          {
            "code": "all_staff_bonus",
            "name": "All Staff Bonus",
            "description": "Provide bonus for 2023-24",
            "isAnnualOnly": true
          }
        ]
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Travel, campaigns, training, and supervision costs",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "campaign_hiv_testing",
            "name": "Campaign for HIV testing",
            "description": "Conduct outreach to provide HIV testing service in communities",
            "isAnnualOnly": false
          },
          {
            "code": "campaign_all",
            "name": "Campaign (All)",
            "description": "Conduct outreach VMMC provision at decentralized level",
            "isAnnualOnly": false
          },
          {
            "code": "training",
            "name": "Training",
            "description": "Conduct training of Peer educators for Negative partner of Sero-Discordant couples on HIV and AIDS and sexual health issues",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_all",
            "name": "Supervision (All)",
            "description": "Conduct integrated clinical mentorship from District Hospital to Health centres to support Treat All and DSDM implementation",
            "isAnnualOnly": false
          },
          {
            "code": "workshop_transport_perdiem",
            "name": "Workshop (Transport & Perdiem)",
            "description": "Conduct quarterly multidisciplinary team meeting (MDT). Participants are those not supported by other donor",
            "isAnnualOnly": false
          },
          {
            "code": "meeting",
            "name": "Meeting",
            "description": "Conduct support group meeting at Health Facilities especially for adolescents and children and younger adults",
            "isAnnualOnly": false
          },
          {
            "code": "transport",
            "name": "Transport",
            "description": "Conduct sample transportation from District Hospitals to Referal hospitals/NRL",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment maintenance and infrastructure",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "maintenance",
            "name": "Maintenance",
            "description": "Support to DHs and HCs to improve and maintain infrastructure standards- Motor car Vehicles",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "pa_section",
        "title": "Program Administration Costs (PA)",
        "description": "Administrative and operational costs",
        "order": 4,
        "categoryCode": "PA",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "bank_charges_commissions",
            "name": "Bank charges & commissions",
            "description": "National and sub-HIV databases",
            "isAnnualOnly": false
          },
          {
            "code": "fuel",
            "name": "Fuel",
            "description": "National and sub-HIV databases",
            "isAnnualOnly": false
          },
          {
            "code": "communication_airtime",
            "name": "Communication (Airtime)",
            "description": "Infrastructure and Equipment",
            "isAnnualOnly": false
          },
          {
            "code": "communication_internet",
            "name": "Communication (Internet)",
            "description": "Infrastructure and Equipment",
            "isAnnualOnly": false
          }
        ]
      }
    ],
    "commonFields": {
      "frequency": {
        "type": "number",
        "label": "Frequency",
        "required": true,
        "min": 0,
        "step": 1
      },
      "unit_cost": {
        "type": "currency",
        "label": "Unit Cost (RWF)",
        "required": true,
        "min": 0
      },
      "count_q1": {
        "type": "number",
        "label": "Count Q1",
        "required": true,
        "min": 0
      },
      "count_q2": {
        "type": "number",
        "label": "Count Q2",
        "required": true,
        "min": 0
      },
      "count_q3": {
        "type": "number",
        "label": "Count Q3",
        "required": true,
        "min": 0
      },
      "count_q4": {
        "type": "number",
        "label": "Count Q4",
        "required": true,
        "min": 0
      },
      "comment": {
        "type": "textarea",
        "label": "Comment",
        "required": false
      }
    },
    "calculations": {
      "amount_q1": "frequency * unit_cost * count_q1",
      "amount_q2": "frequency * unit_cost * count_q2",
      "amount_q3": "frequency * unit_cost * count_q3", 
      "amount_q4": "frequency * unit_cost * count_q4",
      "total": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    }
  }'::jsonb,
  1
);

-- 3. Malaria Health Center Planning Form Schema
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'Malaria Health Center Planning Form',
  '1.0',
  'Malaria',
  'health_center',
  'planning',
  '{
    "formId": "malaria_hc_planning",
    "title": "Malaria Health Center Planning",
    "version": "1.0",
    "description": "Annual planning form for Malaria activities at health center level with quarterly breakdown",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Staff salaries and bonuses for malaria program",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "hc_nurse_a1_salary",
            "name": "HC Nurses (A1) Salary",
            "description": "Provide salaries for health facilities staff (DHs, HCs) - Malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "hc_lab_tech_a1_salary",
            "name": "HC Lab Technician (A1) Salary", 
            "description": "Provide salaries for health facilities staff (DHs, HCs) - Malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "bonus_all_staff",
            "name": "Bonus (All staff paid on GF)",
            "description": "Annual bonus for malaria program staff",
            "isAnnualOnly": true
          }
        ]
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Travel, supervision, and transportation costs for malaria activities",
        "order": 2,
        "categoryCode": "TRC", 
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "workshop",
            "name": "Workshop",
            "description": "Conduct support group meeting at Health Facilities for malaria awareness",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_chws",
            "name": "Supervision (CHWs)",
            "description": "Conduct supervision from Health centers to CHWs for malaria case management",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_home_visit",
            "name": "Supervision (Home Visit)",
            "description": "Conduct home visit for malaria follow up and prevention",
            "isAnnualOnly": false
          },
          {
            "code": "transport",
            "name": "Transport",
            "description": "Conduct sample transportation for malaria testing from Health centers to District Hospitals",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment maintenance and malaria diagnostic tools",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "maintenance_repair",
            "name": "Maintenance and Repair",
            "description": "Support to DHs and HCs to improve and maintain malaria diagnostic equipment",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "pa_section",
        "title": "Program Administration Costs (PA)",
        "description": "Administrative and operational costs for malaria program",
        "order": 4,
        "categoryCode": "PA",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "communication",
            "name": "Communication",
            "description": "Provide running costs for malaria program communication",
            "isAnnualOnly": false
          },
          {
            "code": "office_supplies",
            "name": "Office Supplies",
            "description": "Provide running costs for malaria program office supplies",
            "isAnnualOnly": false
          },
          {
            "code": "transport_mission_reporting",
            "name": "Transport (Mission & Reporting Fee)",
            "description": "Provide running costs for malaria program reporting and missions",
            "isAnnualOnly": false
          },
          {
            "code": "bank_charges",
            "name": "Bank charges",
            "description": "Banking costs for malaria program operations",
            "isAnnualOnly": false
          }
        ]
      }
    ],
    "commonFields": {
      "frequency": {
        "type": "number",
        "label": "Frequency",
        "required": true,
        "min": 0,
        "step": 1
      },
      "unit_cost": {
        "type": "currency",
        "label": "Unit Cost (RWF)",
        "required": true,
        "min": 0
      },
      "count_q1": {
        "type": "number",
        "label": "Count Q1",
        "required": true,
        "min": 0
      },
      "count_q2": {
        "type": "number",
        "label": "Count Q2",
        "required": true,
        "min": 0
      },
      "count_q3": {
        "type": "number", 
        "label": "Count Q3",
        "required": true,
        "min": 0
      },
      "count_q4": {
        "type": "number",
        "label": "Count Q4",
        "required": true,
        "min": 0
      },
      "comment": {
        "type": "textarea",
        "label": "Comment",
        "required": false
      }
    },
    "calculations": {
      "amount_q1": "frequency * unit_cost * count_q1",
      "amount_q2": "frequency * unit_cost * count_q2",
      "amount_q3": "frequency * unit_cost * count_q3",
      "amount_q4": "frequency * unit_cost * count_q4",
      "total": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    }
  }'::jsonb,
  1
);

-- 4. Malaria Hospital Planning Form Schema  
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'Malaria Hospital Planning Form',
  '1.0',
  'Malaria',
  'hospital',
  'planning',
  '{
    "formId": "malaria_hospital_planning",
    "title": "Malaria Hospital Planning",
    "version": "1.0",
    "description": "Annual planning form for Malaria activities at hospital level with quarterly breakdown",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Medical staff salaries and bonuses for malaria program",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "dh_medical_dr_salary",
            "name": "DH Medical Dr. Salary",
            "description": "Provide salaries for medical doctors in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "senior_medical_dr_salary",
            "name": "Senior Medical Dr. Salary",
            "description": "Provide salaries for senior medical doctors in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "chief_medical_dr_salary",
            "name": "Chief Medical Dr. Salary",
            "description": "Provide salaries for chief medical doctors in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "junior_medical_dr_mentor_salary",
            "name": "Junior Medical Dr. or Mentor Salary",
            "description": "Provide salaries for junior medical doctors or mentors in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "pharmacist_salary",
            "name": "Pharmacist Salary",
            "description": "Provide salaries for pharmacists in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "nurse_salary",
            "name": "Nurse Salary",
            "description": "Provide salaries for nurses in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "chw_supervisor_salary",
            "name": "CHW supervisor Salary",
            "description": "Provide salaries for CHW supervisors in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "accountant_salary",
            "name": "Accountant Salary",
            "description": "Provide salaries for accountants in malaria program",
            "isAnnualOnly": false
          },
          {
            "code": "all_staff_bonus",
            "name": "All Staff Bonus",
            "description": "Provide bonus for malaria program staff",
            "isAnnualOnly": true
          }
        ]
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Travel, campaigns, training, and supervision costs for malaria activities",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "malaria_prevention_campaign",
            "name": "Malaria Prevention Campaign",
            "description": "Conduct outreach for malaria prevention and awareness in communities",
            "isAnnualOnly": false
          },
          {
            "code": "malaria_case_management_training",
            "name": "Malaria Case Management Training",
            "description": "Conduct training for malaria case management and treatment protocols",
            "isAnnualOnly": false
          },
          {
            "code": "supervision_all",
            "name": "Supervision (All)",
            "description": "Conduct supervision from District Hospital to Health centres for malaria program implementation",
            "isAnnualOnly": false
          },
          {
            "code": "workshop_transport_perdiem",
            "name": "Workshop (Transport & Perdiem)",
            "description": "Conduct quarterly malaria program review meetings",
            "isAnnualOnly": false
          },
          {
            "code": "meeting",
            "name": "Meeting",
            "description": "Conduct malaria awareness meetings at Health Facilities",
            "isAnnualOnly": false
          },
          {
            "code": "transport",
            "name": "Transport",
            "description": "Conduct sample transportation for malaria testing from District Hospitals to Reference labs",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment maintenance and malaria diagnostic infrastructure",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "maintenance",
            "name": "Maintenance",
            "description": "Support to DHs and HCs to improve and maintain malaria diagnostic equipment and vehicles",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "pa_section",
        "title": "Program Administration Costs (PA)",
        "description": "Administrative and operational costs for malaria program",
        "order": 4,
        "categoryCode": "PA", 
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "bank_charges_commissions",
            "name": "Bank charges & commissions",
            "description": "Banking costs for malaria program operations",
            "isAnnualOnly": false
          },
          {
            "code": "fuel",
            "name": "Fuel",
            "description": "Fuel costs for malaria program activities and transportation",
            "isAnnualOnly": false
          },
          {
            "code": "communication_airtime",
            "name": "Communication (Airtime)",
            "description": "Airtime costs for malaria program communication",
            "isAnnualOnly": false
          },
          {
            "code": "communication_internet",
            "name": "Communication (Internet)",
            "description": "Internet costs for malaria program operations",
            "isAnnualOnly": false
          }
        ]
      }
    ],
    "commonFields": {
      "frequency": {
        "type": "number",
        "label": "Frequency",
        "required": true,
        "min": 0,
        "step": 1
      },
      "unit_cost": {
        "type": "currency",
        "label": "Unit Cost (RWF)",
        "required": true,
        "min": 0
      },
      "count_q1": {
        "type": "number",
        "label": "Count Q1",
        "required": true,
        "min": 0
      },
      "count_q2": {
        "type": "number",
        "label": "Count Q2",
        "required": true,
        "min": 0
      },
      "count_q3": {
        "type": "number",
        "label": "Count Q3",
        "required": true,
        "min": 0
      },
      "count_q4": {
        "type": "number",
        "label": "Count Q4",
        "required": true,
        "min": 0
      },
      "comment": {
        "type": "textarea",
        "label": "Comment",
        "required": false
      }
    },
    "calculations": {
      "amount_q1": "frequency * unit_cost * count_q1",
      "amount_q2": "frequency * unit_cost * count_q2",
      "amount_q3": "frequency * unit_cost * count_q3",
      "amount_q4": "frequency * unit_cost * count_q4",
      "total": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    }
  }'::jsonb,
  1
);

-- 5. TB Hospital Planning Form Schema
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'TB Hospital Planning Form',
  '1.0',
  'TB',
  'hospital',
  'planning',
  '{
    "formId": "tb_hospital_planning",
    "title": "TB Hospital Planning",
    "version": "1.0",
    "description": "Annual planning form for TB activities at hospital level with quarterly breakdown",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "TB program staff salaries and bonuses",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "provincial_tb_coordinator_salary",
            "name": "Provincial TB Coordinator Salary",
            "description": "Salaries for the Provincial TB coordinators",
            "isAnnualOnly": false
          },
          {
            "code": "provincial_tb_coordinator_bonus",
            "name": "Provincial TB Coordinator Bonus",
            "description": "TB Provincial Coordinator bonus 2022/2023",
            "isAnnualOnly": true
          }
        ]
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Travel, contact tracing, mentoring, and supervision costs for TB activities",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "contact_tracing_perdiem",
            "name": "Contact Tracing (Perdiem)",
            "description": "Conduct contacts tracing among TB cases contact by Health Care Providers at HCs (Refreshment or perdiem)",
            "isAnnualOnly": false
          },
          {
            "code": "contact_tracing_transport",
            "name": "Contact Tracing (Transport)",
            "description": "Conduct contacts tracing among TB cases contact by Health Care Providers at HCs (transportation fees)",
            "isAnnualOnly": false
          },
          {
            "code": "contact_tracing_general",
            "name": "Contact Tracing (General)",
            "description": "Conduct contacts tracing among TB cases contact by Health Care Providers at HCs",
            "isAnnualOnly": false
          },
          {
            "code": "tpt_guidelines_mentoring_mission",
            "name": "TPT Guidelines Mentoring (Mission)",
            "description": "Mentor the implementation of the TPT guidelines from DHs to HCs (mission fees)",
            "isAnnualOnly": false
          },
          {
            "code": "tpt_guidelines_mentoring_transport",
            "name": "TPT Guidelines Mentoring (Transport)",
            "description": "Mentor the implementation of the TPT guidelines from DHs to HCs (transportation fees)",
            "isAnnualOnly": false
          },
          {
            "code": "hcw_mentorship_hc_level_mission",
            "name": "HCW Mentorship HC Level (Mission)",
            "description": "Mentorship of HCW at health center level (mission fees)",
            "isAnnualOnly": false
          },
          {
            "code": "hcw_mentorship_hc_level_transport",
            "name": "HCW Mentorship HC Level (Transport)",
            "description": "Mentorship of HCW at health center level (transportation fees)",
            "isAnnualOnly": false
          },
          {
            "code": "hcw_mentorship_community_mission",
            "name": "HCW Mentorship Community (Mission)",
            "description": "Mentorship of HCW at community level (mission fees)",
            "isAnnualOnly": false
          },
          {
            "code": "hcw_mentorship_community_transport",
            "name": "HCW Mentorship Community (Transport)",
            "description": "Mentorship of HCW at community level (transportation fees)",
            "isAnnualOnly": false
          },
          {
            "code": "quarterly_evaluation_meetings_transport",
            "name": "Quarterly Evaluation Meetings (Transport)",
            "description": "Held quarterly evaluation meetings with facilities to cross-check, analyze and use TB data (Transport fees)",
            "isAnnualOnly": false
          },
          {
            "code": "quarterly_evaluation_meetings_allowance",
            "name": "Quarterly Evaluation Meetings (Allowance)",
            "description": "Held quarterly evaluation meetings with facilities to cross-check, analyze and use TB data (mission allowance)",
            "isAnnualOnly": false
          }
        ]
      },
      {
        "id": "pa_section",
        "title": "Program Administration Costs (PA)",
        "description": "Administrative and operational costs for TB program",
        "order": 3,
        "categoryCode": "PA",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"],
        "activities": [
          {
            "code": "hospital_running_costs",
            "name": "Hospital Running Costs",
            "description": "Running cost for the hospital",
            "isAnnualOnly": false
          },
          {
            "code": "bank_charges",
            "name": "Bank charges",
            "description": "Provide running costs for DH",
            "isAnnualOnly": false
          },
          {
            "code": "office_supplies",
            "name": "Office Supplies",
            "description": "Provide running costs for DH",
            "isAnnualOnly": false
          }
        ]
      }
    ],
    "commonFields": {
      "frequency": {
        "type": "number",
        "label": "Frequency",
        "required": true,
        "min": 0,
        "step": 1
      },
      "unit_cost": {
        "type": "currency",
        "label": "Unit Cost (RWF)",
        "required": true,
        "min": 0
      },
      "count_q1": {
        "type": "number",
        "label": "Count Q1",
        "required": true,
        "min": 0
      },
      "count_q2": {
        "type": "number",
        "label": "Count Q2",
        "required": true,
        "min": 0
      },
      "count_q3": {
        "type": "number",
        "label": "Count Q3",
        "required": true,
        "min": 0
      },
      "count_q4": {
        "type": "number",
        "label": "Count Q4",
        "required": true,
        "min": 0
      },
      "comment": {
        "type": "textarea",
        "label": "Comment",
        "required": false
      }
    },
    "calculations": {
      "amount_q1": "frequency * unit_cost * count_q1",
      "amount_q2": "frequency * unit_cost * count_q2",
      "amount_q3": "frequency * unit_cost * count_q3",
      "amount_q4": "frequency * unit_cost * count_q4",
      "total": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    }
  }'::jsonb,
  1
);

-- =================================================================
-- Activity Categories Seeding
-- =================================================================

-- HIV Health Center Activity Categories
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, description, display_order, is_active)
VALUES 
  ('HIV', 'health_center', 'HR', 'Human Resources (HR)', 'Staff salaries and bonuses', 1, true),
  ('HIV', 'health_center', 'TRC', 'Travel Related Costs (TRC)', 'Travel, supervision, and transportation costs', 2, true),
  ('HIV', 'health_center', 'HPE', 'Health Products & Equipment (HPE)', 'Equipment maintenance and infrastructure', 3, true),
  ('HIV', 'health_center', 'PA', 'Program Administration Costs (PA)', 'Administrative and operational costs', 4, true);

-- HIV Hospital Activity Categories
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, description, display_order, is_active)
VALUES 
  ('HIV', 'hospital', 'HR', 'Human Resources (HR)', 'Medical staff salaries and bonuses', 1, true),
  ('HIV', 'hospital', 'TRC', 'Travel Related Costs (TRC)', 'Travel, campaigns, training, and supervision costs', 2, true),
  ('HIV', 'hospital', 'HPE', 'Health Products & Equipment (HPE)', 'Equipment maintenance and infrastructure', 3, true),
  ('HIV', 'hospital', 'PA', 'Program Administration Costs (PA)', 'Administrative and operational costs', 4, true);

-- Malaria Health Center Activity Categories
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, description, display_order, is_active)
VALUES 
  ('Malaria', 'health_center', 'HR', 'Human Resources (HR)', 'Staff salaries and bonuses for malaria program', 1, true),
  ('Malaria', 'health_center', 'TRC', 'Travel Related Costs (TRC)', 'Travel, supervision, and transportation costs for malaria activities', 2, true),
  ('Malaria', 'health_center', 'HPE', 'Health Products & Equipment (HPE)', 'Equipment maintenance and malaria diagnostic tools', 3, true),
  ('Malaria', 'health_center', 'PA', 'Program Administration Costs (PA)', 'Administrative and operational costs for malaria program', 4, true);

-- Malaria Hospital Activity Categories
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, description, display_order, is_active)
VALUES 
  ('Malaria', 'hospital', 'HR', 'Human Resources (HR)', 'Medical staff salaries and bonuses for malaria program', 1, true),
  ('Malaria', 'hospital', 'TRC', 'Travel Related Costs (TRC)', 'Travel, campaigns, training, and supervision costs for malaria activities', 2, true),
  ('Malaria', 'hospital', 'HPE', 'Health Products & Equipment (HPE)', 'Equipment maintenance and malaria diagnostic infrastructure', 3, true),
  ('Malaria', 'hospital', 'PA', 'Program Administration Costs (PA)', 'Administrative and operational costs for malaria program', 4, true);

-- TB Hospital Activity Categories (TB doesn't apply to health centers)
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, description, display_order, is_active)
VALUES 
  ('TB', 'hospital', 'HR', 'Human Resources (HR)', 'TB program staff salaries and bonuses', 1, true),
  ('TB', 'hospital', 'TRC', 'Travel Related Costs (TRC)', 'Travel, contact tracing, mentoring, and supervision costs for TB activities', 2, true),
  ('TB', 'hospital', 'PA', 'Program Administration Costs (PA)', 'Administrative and operational costs for TB program', 3, true);

-- =================================================================
-- Dynamic Activities Seeding
-- =================================================================

-- Get category IDs for reference (these would need to be retrieved dynamically in actual implementation)
-- For the purpose of this seed file, we'll use placeholder category IDs that would be resolved at runtime

-- HIV Health Center Activities
WITH hiv_hc_categories AS (
  SELECT id, code FROM schema_activity_categories 
  WHERE project_type = 'HIV' AND facility_type = 'health_center'
)
INSERT INTO dynamic_activities (category_id, project_type, facility_type, code, name, description, activity_type, display_order, is_active)
SELECT 
  cat.id,
  'HIV'::project_type,
  'health_center'::facility_type,
  activity_data.code,
  activity_data.name,
  activity_data.description,
  activity_data.activity_type,
  activity_data.display_order,
  true
FROM hiv_hc_categories cat
CROSS JOIN (
  VALUES
    ('HR', 'hc_nurse_a1_salary', 'HC Nurses (A1) Salary', 'Provide salaries for health facilities staff (DHs, HCs)', 'HC Nurses (A1) Salary', 1),
    ('HR', 'hc_lab_tech_a1_salary', 'HC Lab Technician (A1) Salary', 'Provide salaries for health facilities staff (DHs, HCs)', 'HC Lab Technician (A1) Salary', 2),
    ('HR', 'bonus_all_staff', 'Bonus (All staff paid on GF)', 'Provide salaries for health facilities staff (DHs, HCs)', 'Bonus (All staff paid on GF)', 3),
    ('TRC', 'workshop', 'Workshop', 'Conduct support group meeting at Health Facilities especially for adolescents and children', 'Workshop', 1),
    ('TRC', 'supervision_chws', 'Supervision (CHWs)', 'Conduct supervision from Health centers to CHWs', 'Supervision (CHWs)', 2),
    ('TRC', 'supervision_home_visit', 'Supervision (Home Visit)', 'Conduct home visit for lost to follow up', 'Supervision (Home Visit)', 3),
    ('TRC', 'transport', 'Transport', 'Conduct sample transportation from Health centers to District Hospitals', 'Transport', 4),
    ('HPE', 'maintenance_repair', 'Maintenance and Repair', 'Support to DHs and HCs to improve and maintain infrastructure standards', 'Maintenance and Repair', 1),
    ('PA', 'communication', 'Communication', 'Provide running costs for DHs & HCs', 'Communication', 1),
    ('PA', 'office_supplies', 'Office Supplies', 'Provide running costs for DHs & HCs', 'Office Supplies', 2),
    ('PA', 'transport_mission_reporting', 'Transport (Mission & Reporting Fee)', 'Provide running costs for DHs & HCs', 'Transport (Mission & Reporting Fee)', 3),
    ('PA', 'bank_charges', 'Bank charges', 'Provide running costs for DHs & HCs', 'Bank charges', 4)
) AS activity_data(category_code, code, name, description, activity_type, display_order)
WHERE cat.code = activity_data.category_code;

-- =================================================================
-- Form Fields Seeding
-- =================================================================

-- Common planning form fields for all schemas
WITH form_schema_ids AS (
  SELECT id, name FROM form_schemas WHERE module_type = 'planning'
)
INSERT INTO form_fields (schema_id, field_key, label, field_type, is_required, display_order, field_config, validation_rules, default_value, help_text, is_visible, is_editable)
SELECT 
  fs.id,
  field_data.field_key,
  field_data.label,
  field_data.field_type::form_field_type,
  field_data.is_required,
  field_data.display_order,
  field_data.field_config::jsonb,
  field_data.validation_rules::jsonb,
  field_data.default_value::jsonb,
  field_data.help_text,
  true,
  true
FROM form_schema_ids fs
CROSS JOIN (
  VALUES
    ('frequency', 'Frequency', 'number', true, 1, '{"min": 0, "step": 1}', '{"required": true, "min": 0}', '1', 'How often this activity occurs', true, true),
    ('unit_cost', 'Unit Cost (RWF)', 'currency', true, 2, '{"min": 0, "currency": "RWF"}', '{"required": true, "min": 0}', '0', 'Cost per unit in Rwandan Francs', true, true),
    ('count_q1', 'Count Q1', 'number', true, 3, '{"min": 0}', '{"required": true, "min": 0}', '0', 'Number of units for Quarter 1', true, true),
    ('count_q2', 'Count Q2', 'number', true, 4, '{"min": 0}', '{"required": true, "min": 0}', '0', 'Number of units for Quarter 2', true, true),
    ('count_q3', 'Count Q3', 'number', true, 5, '{"min": 0}', '{"required": true, "min": 0}', '0', 'Number of units for Quarter 3', true, true),
    ('count_q4', 'Count Q4', 'number', true, 6, '{"min": 0}', '{"required": true, "min": 0}', '0', 'Number of units for Quarter 4', true, true),
    ('comment', 'Comment', 'textarea', false, 7, '{"rows": 3, "maxLength": 500}', '{"maxLength": 500}', '""', 'Additional comments or notes', true, true),
    ('amount_q1', 'Amount Q1', 'calculated', false, 8, '{}', '{}', '0', 'Auto-calculated: Frequency × Unit Cost × Count Q1', true, false),
    ('amount_q2', 'Amount Q2', 'calculated', false, 9, '{}', '{}', '0', 'Auto-calculated: Frequency × Unit Cost × Count Q2', true, false),
    ('amount_q3', 'Amount Q3', 'calculated', false, 10, '{}', '{}', '0', 'Auto-calculated: Frequency × Unit Cost × Count Q3', true, false),
    ('amount_q4', 'Amount Q4', 'calculated', false, 11, '{}', '{}', '0', 'Auto-calculated: Frequency × Unit Cost × Count Q4', true, false),
    ('total', 'Total', 'calculated', false, 12, '{}', '{}', '0', 'Auto-calculated: Sum of all quarterly amounts', true, false)
) AS field_data(field_key, label, field_type, is_required, display_order, field_config, validation_rules, default_value, help_text, is_visible, is_editable);

-- =================================================================
-- System Configuration for Planning Module
-- =================================================================

INSERT INTO system_configurations (config_key, config_value, description, config_type, scope, is_active)
VALUES 
  ('planning_form_validation', '{"enableRealTimeValidation": true, "showCalculationsLive": true, "allowNegativeValues": false}', 'Global validation rules for planning forms', 'validation', 'GLOBAL', true),
  ('currency_settings', '{"defaultCurrency": "RWF", "decimalPlaces": 2, "thousandsSeparator": ","}', 'Currency display and calculation settings', 'form', 'GLOBAL', true),
  ('quarterly_periods', '{"Q1": {"months": [1,2,3], "label": "Quarter 1"}, "Q2": {"months": [4,5,6], "label": "Quarter 2"}, "Q3": {"months": [7,8,9], "label": "Quarter 3"}, "Q4": {"months": [10,11,12], "label": "Quarter 4"}}', 'Quarterly period definitions', 'form', 'GLOBAL', true),
  ('form_autosave', '{"enabled": true, "intervalSeconds": 30, "showSaveStatus": true}', 'Form autosave configuration', 'form', 'GLOBAL', true);

-- =================================================================
-- Comments and Usage Instructions
-- =================================================================

/*
USAGE INSTRUCTIONS:

1. Run this script to seed the form schemas for the planning module
2. The schemas are created for:
   - HIV Health Center Planning
   - HIV Hospital Planning  
   - Malaria Health Center Planning
   - Malaria Hospital Planning
   - TB Hospital Planning (TB doesn't apply to health centers)

3. Each schema includes:
   - Form structure with sections and activities
   - Field definitions with validation rules
   - Calculation formulas for auto-computed fields
   - Activity categories and mappings

4. After seeding, you can:
   - Query form_schemas table to get schema definitions
   - Use schema_activity_categories for activity grouping
   - Reference dynamic_activities for activity details
   - Use form_fields for individual field configurations

5. The system_configurations table contains global settings that affect
   form behavior, validation, and display.

6. To extend or modify:
   - Update the JSON schema in form_schemas table
   - Add new activities to dynamic_activities
   - Modify field configurations in form_fields
   - Update system_configurations for global changes

NEXT STEPS:
- Create similar schemas for execution and reporting modules
- Set up event mappings for financial statement generation
- Configure user permissions and access controls
- Implement form rendering logic based on these schemas
*/