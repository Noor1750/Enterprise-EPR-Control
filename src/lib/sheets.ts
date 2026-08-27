import { getAccessToken } from './firebase';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Default initial data for local storage database
const DEFAULT_LOCAL_DB: Record<string, string[][]> = {
  Users: [
    ['Username', 'Password_Hash', 'Role', 'Status', 'Access_Level', 'Supervisor_Name', 'Access_Limit_Type', 'Assigned_Employee_IDs', 'Assigned_Department', 'Employee_ID', 'Employee_Name', 'Input_Permissions'],
    ['smltrimsbd@gmail.com', 'Samia@628', 'Admin', 'Active', 'All', '', 'all', '', '', 'ADMIN-001', 'Admin (SML Trims BD)', 'all'],
    ['noor.alam1750@gmail.com', 'Samia@628', 'Admin', 'Active', 'All', '', 'all', '', '', 'ADMIN-002', 'Md. Noor Alam', 'all']
  ],
  Employees: [
    ['ID_No', 'Name', 'Designation', 'Department', 'Date_of_Join', 'Current_Position', 'Supervisor_Name', 'Present_Salary', 'Overtime_Rate', 'Status', 'Inactive_Date', 'Phone', 'Emergency_Contact', 'Shift', 'Blood_Group', 'Working_Area', 'Profile_Picture', 'Manager', 'TShirt_Size', 'Shoe_Size', 'Volunteer', 'Date_of_Birth', 'Shift_Mode', 'Shift_Effective_Date', 'Rotation_Starting_Shift', 'Shift_Remarks'],
    ['EMP001', 'John Doe', 'Senior Operator', 'Cutting', '2023-01-15', 'Operator', 'Sarah Connor', '50000', '250', 'Active', '', '+1-555-0101', '+1-555-0102', 'Day Shift', 'O+', 'Floor 1', '', 'Michael Scott', 'L', '42', 'Yes', '1990-05-12', 'Automatic Rotation', '2026-08-01', 'Day Shift', 'Weekly A/B rotating schedule'],
    ['EMP002', 'Jane Smith', 'Quality Inspector', 'Sewing', '2022-03-10', 'Inspector', 'Sarah Connor', '45000', '220', 'Active', '', '+1-555-0103', '+1-555-0104', 'Day Shift', 'A+', 'Floor 2', '', 'Michael Scott', 'M', '38', 'No', '1993-08-22', 'Automatic Rotation', '2026-08-01', 'Day Shift', 'Weekly A/B rotating schedule'],
    ['EMP003', 'Alex Johnson', 'Finishing Lead', 'Finishing', '2021-06-01', 'Team Lead', 'Sarah Connor', '55000', '280', 'Active', '', '+1-555-0105', '+1-555-0106', 'Night Shift', 'B+', 'Floor 3', '', 'Michael Scott', 'XL', '44', 'Yes', '1988-11-04', 'Automatic Rotation', '2026-08-01', 'Night Shift', 'Weekly A/B rotating schedule'],
    ['EMP004', 'Robert Brown', 'Packaging Specialist', 'Packaging', '2023-08-20', 'Specialist', 'Sarah Connor', '40000', '200', 'Active', '', '+1-555-0107', '+1-555-0108', 'General', 'AB+', 'Floor 1', '', 'Michael Scott', 'L', '41', 'No', '1995-02-18', 'Manual Override', '2026-08-01', 'General', 'Assigned to permanent General shift'],
    ['EMP005', 'Emily Davis', 'Maintenance Tech', 'Maintenance', '2020-11-12', 'Technician', 'Sarah Connor', '52000', '260', 'Active', '', '+1-555-0109', '+1-555-0110', 'Night Shift', 'O-', 'Workshop', '', 'Michael Scott', 'S', '37', 'Yes', '1992-09-30', 'Automatic Rotation', '2026-08-01', 'Night Shift', 'Weekly A/B rotating schedule'],
    ['EMP006', 'David Wilson', 'Pattern Maker', 'Cutting', '2022-09-15', 'Pattern Specialist', 'Sarah Connor', '48000', '240', 'Active', '', '+1-555-0111', '+1-555-0112', 'Day Shift', 'A-', 'Floor 1', '', 'Michael Scott', 'M', '40', 'No', '1991-07-14', 'Automatic Rotation', '2026-08-01', 'Day Shift', 'Weekly A/B rotating schedule']
  ],
  MachineCapacity: [
    ['Brand Name', 'Department', 'Operator Category', 'Process Name', 'Machine Name', 'Standard Unit', 'Specification Per Minutes', 'Standard Speed Per Minutes', 'Utilization %', 'Conversion ratio/UPS', 'Capacity 16 Hours Pcs', 'Capacity 16 Hours Machine Unit', 'Day Shift Manpower Required', 'Night Shift Manpower Required', 'General Shift Manpower Required', 'Manpower Allocation', 'Overtime', 'Capacity with existing manpower Pcs', 'Capacity with Existing manpower Machine Unit', 'Capacity Count', 'Machine No', 'Model Number', 'Serial Number', 'Asset Tag', 'Onboard Date', 'Obsolete Date'],
    ['CL-326IE', 'RFID', 'A', 'Encoding & Verification', 'CL-326IE', 'Pcs', '1.2', '4200', '90', '1', '600', '1', '1', '1', '0', 'Both Shift', '0', '600', '1', 'Yes', 'MC-RFID-01'],
    ['ZSM108', 'Woven', 'A', 'High-Speed Weaving', 'ZSM108', 'Mtr', '0.8', '3500', '88', '1', '850', '1', '1', '1', '0', 'Both Shift', '0', '850', '1', 'Yes', 'MC-WOV-02'],
    ['RIM601H', 'Offset', 'A', 'Multi-Color Offset Printing', 'RIM601H', 'Sheets', '0.5', '5000', '92', '1', '1200', '1', '2', '2', '0', 'Both Shift', '0', '1200', '1', 'Yes', 'MC-OFF-03'],
    ['Brother', 'Sewing', 'A', 'Lockstitch', 'Single Needle', 'Pcs', '1.5', '4500', '85', '1', '450', '1', '1', '1', '0', 'Both Shift', '0', '400', '1', 'Yes', 'MC-SEW-01'],
    ['Juki', 'Cutting', 'A', 'Auto Cutter', 'Cutter 5000', 'Pcs', '0.5', '3000', '90', '1', '900', '1', '1', '0', '0', 'One Shift', '0', '900', '1', 'Yes', 'MC-CUT-01'],
    ['FlexoTech', 'PFL', 'A', 'Label Flexo Printing', 'PFL Flexo 4C', 'Pcs', '1.0', '3800', '85', '1', '750', '1', '1', '1', '0', 'Both Shift', '0', '750', '1', 'Yes', 'MC-PFL-01'],
    ['PackMaster', 'Packaging', 'B', 'Auto Sealing & Carton Packing', 'Packer P-10', 'Boxes', '2.0', '2500', '90', '1', '500', '1', '1', '1', '0', 'Both Shift', '0', '500', '1', 'Yes', 'MC-PKG-01']
  ],
  SkillMatrix: [
    ['ID_No', 'Machine_Job', 'Skill_Level'],
    ['EMP001', 'Single Needle', 'Level 4'],
    ['EMP002', 'Quality Audit', 'Level 5'],
    ['EMP005', 'Maintenance & Diagnostics', 'Level 5']
  ],
  Leave: [
    ['Leave_ID', 'ID_No', 'Name', 'Designation', 'Department', 'From_Date', 'To_Date', 'Days', 'Status', 'Supervisor_Signoff', 'Reason', 'Approval_Date', 'Settlement_Status', 'Settlement_Date', 'Settled_By_ID', 'Settled_By_Name', 'Settlement_Remarks', 'Created_At', 'Leave_Type'],
    ['LV-1001', 'EMP001', 'John Doe', 'Senior Operator', 'Cutting', '2026-08-20', '2026-08-22', '3', 'HR Pending', 'Sarah Connor', 'Personal travel', '2026-08-19', 'HR Pending', '', '', '', '', '2026-08-18', 'Annual Leave'],
    ['LV-1002', 'EMP002', 'Jane Smith', 'Quality Inspector', 'Sewing', '2026-08-21', '2026-08-21', '1', 'HR Pending', 'Sarah Connor', 'Family emergency', '2026-08-19', 'HR Pending', '', '', '', '', '2026-08-18', 'Casual Leave'],
    ['LV-1003', 'EMP003', 'Alex Johnson', 'Finishing Lead', 'Finishing', '2026-08-24', '2026-08-26', '3', 'Pending', '', 'Medical appointment', '', '', '', '', '', '', '2026-08-19', 'Sick Leave'],
    ['LV-1004', 'EMP004', 'Robert Brown', 'Packaging Specialist', 'Packaging', '2026-08-15', '2026-08-16', '2', 'Settlement', 'Sarah Connor', 'Relocation', '2026-08-14', 'Settlement', '2026-08-16 11:30', 'ADMIN-001', 'Md. Noor Alam', 'Fully processed and adjusted', '2026-08-13', 'Annual Leave'],
    ['LV-1005', 'EMP005', 'Emily Davis', 'Maintenance Tech', 'Maintenance', '2026-08-10', '2026-08-12', '3', 'Rejected', 'Sarah Connor', 'Shortage of technicians', '2026-08-09', '', '', '', '', '', '2026-08-08', 'Casual Leave'],
    ['LV-1006', 'EMP006', 'David Wilson', 'Pattern Maker', 'Cutting', '2026-08-25', '2026-08-27', '3', 'HR Pending', 'Sarah Connor', 'Festival vacation', '2026-08-19', 'HR Pending', '', '', '', '', '2026-08-18', 'Annual Leave']
  ],
  SettlementAuditLog: [
    ['Log_ID', 'Timestamp', 'Date', 'Time', 'User_ID', 'User_Name', 'User_Role', 'Processed_Count', 'Settled_Count', 'Skipped_Count', 'Record_IDs', 'Details'],
    ['LOG-1001', '2026-08-16T11:30:00.000Z', '2026-08-16', '11:30', 'ADMIN-001', 'Md. Noor Alam', 'Admin', '1', '1', '0', 'LV-1004', 'Admin Noor settled 1 leave application on 16-Aug-2026 at 11:30.']
  ],
  Overtime: [
    ['OT_ID', 'Date', 'ID_No', 'Name', 'Designation', 'Department', 'OT_Hours'],
    ['OT-1001', '2026-08-10', 'EMP001', 'John Doe', 'Senior Operator', 'Cutting', '2.5']
  ],
  Holidays: [
    ['Holiday_ID', 'Holiday_Name', 'Holiday_Date', 'Day', 'Holiday_Type', 'Work_Type', 'Description', 'Status', 'Created_By', 'Created_Date', 'Updated_By', 'Updated_Date'],
    ['HOL-2026-001', 'New Year Day', '2026-01-01', 'Thursday', 'Public Holiday', 'Non-Working Holiday', 'International New Year celebration', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-002', 'Shab-e-Barat', '2026-02-04', 'Wednesday', 'Festival Holiday', 'Non-Working Holiday', 'Holy night of forgiveness', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-003', 'International Mother Language Day', '2026-02-21', 'Saturday', 'Public Holiday', 'Non-Working Holiday', 'Martyrs Day & Mother Language Day', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-004', 'Independence & National Day', '2026-03-26', 'Thursday', 'Public Holiday', 'Non-Working Holiday', 'National Independence Day of Bangladesh', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-005', 'Pahela Baishakh (Bengali New Year)', '2026-04-14', 'Tuesday', 'Festival Holiday', 'Non-Working Holiday', 'Bangla Noboborsho Festival', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-006', 'May Day', '2026-05-01', 'Friday', 'Public Holiday', 'Non-Working Holiday', 'Labour rights & international solidarity', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-007', 'National Mourning Day', '2026-08-15', 'Saturday', 'Public Holiday', 'Non-Working Holiday', 'National remembrance day', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-008', 'Victory Day (Bijoy Dibos)', '2026-12-16', 'Wednesday', 'Public Holiday', 'Non-Working Holiday', 'Victory in Liberation War 1971', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z'],
    ['HOL-2026-009', 'Christmas Day', '2026-12-25', 'Friday', 'Public Holiday', 'Non-Working Holiday', 'Christmas Holy celebration', 'Active', 'Admin', '2026-01-01T00:00:00.000Z', 'Admin', '2026-01-01T00:00:00.000Z']
  ],
  HolidayOverrides: [
    ['Override_ID', 'Holiday_Date', 'Holiday_Name', 'Department', 'Section', 'Working_Hours', 'Shift', 'Remarks', 'Approved_By', 'Created_At'],
    ['OVR-1001', '2026-08-15', 'National Mourning Day', 'Maintenance', 'Workshop', '8', 'Day Shift', 'Emergency preventative line overhaul scheduled', 'Sarah Connor', '2026-08-10T09:00:00.000Z']
  ],
  HolidayAudit: [
    ['Audit_ID', 'Holiday_ID', 'Holiday_Name', 'Action', 'Previous_Value', 'New_Value', 'Changed_By', 'Changed_At', 'Remarks'],
    ['AUD-1001', 'HOL-2026-004', 'Independence & National Day', 'Created', '', 'Active / Non-Working Holiday', 'noor.alam1750@gmail.com', '2026-01-01T00:00:00.000Z', 'Initial calendar configuration']
  ],
  HolidayTypes: [
    ['Type_ID', 'Type_Name', 'Description', 'Status'],
    ['HT-01', 'Public Holiday', 'National and government declared public holidays', 'Active'],
    ['HT-02', 'Company Holiday', 'Company specific annual and founder holidays', 'Active'],
    ['HT-03', 'Festival Holiday', 'Religious and cultural festival holidays', 'Active'],
    ['HT-04', 'Special Holiday', 'One-off special corporate and management declared holidays', 'Active'],
    ['HT-05', 'Emergency Holiday', 'Unplanned emergency or safety closure', 'Active'],
    ['HT-06', 'Weekly Off', 'Scheduled weekly weekend off (Friday)', 'Active'],
    ['HT-07', 'Other', 'General or unspecified holiday classification', 'Active']
  ],
  CalendarSettings: [
    ['Key', 'Value', 'Updated_By', 'Updated_At'],
    ['weekly_off_day', 'Friday', 'Admin', '2026-01-01T00:00:00.000Z']
  ],
  BestPractices: [
    ['BP_ID', 'Date', 'ID_No', 'Name', 'Designation', 'Department', 'Details', 'Savings_USD'],
    ['BP-1', '2026-07-15', 'EMP001', 'John Doe', 'Senior Operator', 'Cutting', 'Optimized fabric layout marker', '1200']
  ],
  Supervisors: [
    ['Name', 'Role', 'Department'],
    ['Sarah Connor', 'Supervisor', 'Cutting, Sewing, RFID, Woven, Offset'],
    ['Michael Scott', 'Manager', 'Cutting, Sewing, Finishing, Packaging, Maintenance, RFID, Woven, Offset, PFL']
  ],
  KPI: [
    ['KPI_ID', 'Employee_ID', 'Employee_Name', 'Department', 'Month', 'Date', 'Plan', 'Achievement', 'Rating', 'Created_At', 'Updated_At'],
    ['EMP001_2026-07', 'EMP001', 'John Doe', 'Cutting', '2026-07', '2026-07-31', '90', '85', '4', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP002_2026-07', 'EMP002', 'Jane Smith', 'Sewing', '2026-07', '2026-07-31', '95', '92', '5', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP003_2026-07', 'EMP003', 'Alex Johnson', 'Finishing', '2026-07', '2026-07-31', '85', '78', '3', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP004_2026-07', 'EMP004', 'Robert Brown', 'Packaging', '2026-07', '2026-07-31', '80', '80', '4', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP005_2026-07', 'EMP005', 'Emily Davis', 'Maintenance', '2026-07', '2026-07-31', '90', '88', '4', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP006_2026-07', 'EMP006', 'David Wilson', 'Cutting', '2026-07', '2026-07-31', '85', '82', '4', '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['EMP001_2026-08', 'EMP001', 'John Doe', 'Cutting', '2026-08', '2026-08-15', '92', '90', '5', '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z'],
    ['EMP002_2026-08', 'EMP002', 'Jane Smith', 'Sewing', '2026-08', '2026-08-15', '95', '94', '5', '2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z']
  ],
  KpiPrivacy: [
    ['Employee_ID', 'Hidden_By', 'Hidden_At', 'Reason'],
    ['EMP003', 'Admin', '2026-08-01T00:00:00.000Z', 'Confidential Performance']
  ],
  Shifts: [
    ['Shift_ID', 'Shift_Name', 'Start_Time', 'End_Time', 'Status'],
    ['SHF-001', 'Day Shift', '09:00', '18:00', 'Active'],
    ['SHF-002', 'Night Shift', '20:00', '05:00', 'Active'],
    ['SHF-003', 'General', '09:00', '18:00', 'Active']
  ],
  ShiftAssignments: [
    ['Assignment_ID', 'Date', 'Shift_ID', 'Shift_Name', 'Machine_ID', 'Machine_Name', 'Employee_ID', 'Employee_Name', 'Assigned_By', 'Assignment_Time', 'Status', 'Unassigned_By', 'Unassigned_Time', 'Remarks']
  ],
  Tasks: [
    ['Task_ID', 'Title', 'Description', 'Assignee_ID', 'Assignee_Name', 'Assignee_Department', 'Created_By_ID', 'Created_By_Name', 'Category', 'Start_Date', 'Due_Date', 'Due_Time', 'Priority', 'Status', 'Progress', 'Recurrence_Type', 'Recurrence_Day', 'Recurrence_Date', 'Parent_Recurring_ID', 'Occurrence_Date', 'Created_At', 'Updated_At', 'Completed_At', 'Deleted', 'Deleted_At', 'Deleted_By']
  ],
  ShiftHistory: [
    ['History_ID', 'Employee_ID', 'Employee_Name', 'Previous_Shift', 'New_Shift', 'Effective_Date', 'Assignment_Type', 'Changed_By', 'Changed_At', 'Remarks'],
    ['SHIST-1001', 'EMP001', 'John Doe', 'General', 'Day Shift', '2026-08-01', 'Automatic Rotation', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Initial automatic rotation setup'],
    ['SHIST-1002', 'EMP002', 'Jane Smith', 'General', 'Day Shift', '2026-08-01', 'Automatic Rotation', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Initial automatic rotation setup'],
    ['SHIST-1003', 'EMP003', 'Alex Johnson', 'General', 'Night Shift', '2026-08-01', 'Automatic Rotation', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Initial automatic rotation setup'],
    ['SHIST-1004', 'EMP004', 'Robert Brown', 'Day Shift', 'General', '2026-08-01', 'Manual Override', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Assigned to permanent General shift'],
    ['SHIST-1005', 'EMP005', 'Emily Davis', 'General', 'Night Shift', '2026-08-01', 'Automatic Rotation', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Initial automatic rotation setup'],
    ['SHIST-1006', 'EMP006', 'David Wilson', 'General', 'Day Shift', '2026-08-01', 'Automatic Rotation', 'ADMIN-001', '2026-08-01T08:00:00.000Z', 'Initial automatic rotation setup']
  ],
  BreakdownLog: [
    [
      'Breakdown_ID', 'Date', 'Department', 'Machine_Name', 'Machine_No', 'Problem_Description', 
      'Production_Stop', 'Report_At', 'Reporter_ID', 'Reporter_Name', 'Attend_At', 'Response_Time_Min', 
      'Machine_Start_At', 'Hour_Lost_Hours', 'Hour_Lost_Formatted', 'Attend_By_ID', 'Attend_By_Name', 
      'Attend_By_All', 'Failure_Mode', 'Category', 'Activity', 'Spare_Parts_Service', 'Quantity', 
      'UOM', 'Unit_Cost', 'Total_Cost', 'Status', 'Remarks', 'Created_By', 'Created_At', 'Updated_By', 'Updated_At'
    ],
    [
      'BD-2026-00001', '2026-08-18', 'RFID', 'CL-326IE', 'MC-RFID-01', 
      'Machine stopped during RFID encoding. Encoding error occurred continuously and machine could not continue production.',
      'Yes', '10:35', 'EMP001', 'John Doe', '10:47', '12', 
      '12:15', '1.67', '1 Hour 40 Minutes (1.67 Hrs)', 'EMP005', 'Emily Davis', 
      'EMP005 (Emily Davis)', 'RFID / Encoding', 'Breakdown', 'RFID reader replacement', 'RFID Reader', '1', 
      'PCS', '310.00', '310.00', 'Closed', 'Replaced antenna reader and recalibrated encoding head. Production resumed safely.', 'noor.alam1750@gmail.com', '2026-08-18T10:35:00.000Z', 'noor.alam1750@gmail.com', '2026-08-18T12:20:00.000Z'
    ],
    [
      'BD-2026-00002', '2026-08-19', 'Woven', 'ZSM108', 'MC-WOV-02', 
      'Main drive sensor failure causing rapid thread snapping and tension alert.', 
      'Yes', '11:20', 'EMP002', 'Jane Smith', '11:28', '8', 
      '12:45', '1.42', '1 Hour 25 Minutes (1.42 Hrs)', 'EMP005', 'Emily Davis', 
      'EMP005 (Emily Davis)', 'Sensor', 'Breakdown', 'Sensor replacement', 'Sensor', '2', 
      'PCS', '45.00', '90.00', 'Closed', 'Installed optical tension sensors and aligned loom feeder.', 'noor.alam1750@gmail.com', '2026-08-19T11:20:00.000Z', 'noor.alam1750@gmail.com', '2026-08-19T12:50:00.000Z'
    ],
    [
      'BD-2026-00003', '2026-08-20', 'Offset', 'RIM601H', 'MC-OFF-03', 
      'Plate cylinder motor overheating and ink roller alignment vibration.', 
      'Yes', '09:15', 'EMP006', 'David Wilson', '09:30', '15', 
      '', '0', '—', 'EMP005', 'Emily Davis', 
      'EMP005 (Emily Davis)', 'Mechanical', 'Breakdown', 'Motor checking', 'Motor', '1', 
      'PCS', '180.00', '180.00', 'Maintenance in Progress', 'Bearing checked, replacement motor being fitted on-site.', 'noor.alam1750@gmail.com', '2026-08-20T09:15:00.000Z', 'noor.alam1750@gmail.com', '2026-08-20T09:35:00.000Z'
    ],
    [
      'BD-2026-00004', '2026-08-20', 'PFL', 'PFL Flexo 4C', 'MC-PFL-01', 
      'Print head nozzle clogging causing uneven print resolution on care labels.', 
      'No', '14:10', 'EMP004', 'Robert Brown', '14:20', '10', 
      '', '0', '0 Hours 0 Minutes', 'EMP005', 'Emily Davis', 
      'EMP005 (Emily Davis)', 'Printing', 'Preventive Maintenance', 'Print head cleaning', 'Software Service', '1', 
      'SERVICE', '50.00', '50.00', 'Under Investigation', 'Running cleaning cycle while offline section produces sample.', 'noor.alam1750@gmail.com', '2026-08-20T14:10:00.000Z', 'noor.alam1750@gmail.com', '2026-08-20T14:25:00.000Z'
    ]
  ],
  BreakdownAuditLog: [
    ['Log_ID', 'Breakdown_ID', 'Timestamp', 'Date', 'Time', 'User_ID', 'User_Name', 'User_Role', 'Action', 'Details'],
    ['BD-AUD-001', 'BD-2026-00001', '2026-08-18T10:35:00.000Z', '2026-08-18', '10:35:00', 'EMP001', 'John Doe', 'Operator', 'Created', 'Breakdown BD-2026-00001 created for CL-326IE (RFID) with Production Stop = Yes.'],
    ['BD-AUD-002', 'BD-2026-00001', '2026-08-18T10:47:00.000Z', '2026-08-18', '10:47:00', 'EMP005', 'Emily Davis', 'Maintenance', 'Attended', 'Technician Emily Davis attended breakdown at 10:47 (Response time: 12 minutes). Status changed to Maintenance in Progress.'],
    ['BD-AUD-003', 'BD-2026-00001', '2026-08-18T12:15:00.000Z', '2026-08-18', '12:15:00', 'EMP005', 'Emily Davis', 'Maintenance', 'Machine Started', 'Machine started at 12:15. Total Hour Lost calculated: 1.67 Hours (1 Hour 40 Minutes). Total Cost: $310.00.'],
    ['BD-AUD-004', 'BD-2026-00001', '2026-08-18T12:20:00.000Z', '2026-08-18', '12:20:00', 'ADMIN-001', 'Md. Noor Alam', 'Admin', 'Closed', 'Breakdown BD-2026-00001 marked as Closed.']
  ],
  BreakdownSettings: [
    ['Type', 'Value', 'Description', 'Status'],
    ['FailureMode', 'Mechanical', 'Mechanical component wear or failure', 'Active'],
    ['FailureMode', 'Electrical', 'Power surges, blown fuses, wire failure', 'Active'],
    ['FailureMode', 'Electronic', 'Circuit board or controller faults', 'Active'],
    ['FailureMode', 'Software', 'Firmware, OS, or communication errors', 'Active'],
    ['FailureMode', 'RFID / Encoding', 'RFID reader, antenna, or encoding faults', 'Active'],
    ['FailureMode', 'Sensor', 'Optical, laser, or magnetic sensor defect', 'Active'],
    ['FailureMode', 'Pneumatic', 'Air pressure, cylinder, valve leak', 'Active'],
    ['FailureMode', 'Hydraulic', 'Fluid pressure or valve blockage', 'Active'],
    ['FailureMode', 'Printing', 'Print head, ink feeder, or roller issue', 'Active'],
    ['FailureMode', 'Cutting', 'Blade bluntness or cutter alignment', 'Active'],
    ['FailureMode', 'Communication', 'RS232, USB, or Ethernet bus error', 'Active'],
    ['FailureMode', 'Network', 'LAN or cloud connectivity drop', 'Active'],
    ['FailureMode', 'Other', 'General or uncategorized issue', 'Active'],
    ['Category', 'Breakdown', 'Unscheduled machine stoppage', 'Active'],
    ['Category', 'Preventive Maintenance', 'Scheduled PM service', 'Active'],
    ['Category', 'Corrective Maintenance', 'Minor corrective repair during shift', 'Active'],
    ['Category', 'Calibration', 'Tuning precision and tolerances', 'Active'],
    ['Category', 'Inspection', 'Safety and condition assessment', 'Active'],
    ['Category', 'Setup', 'Tooling and product changeover setup', 'Active'],
    ['Category', 'Other', 'Other maintenance category', 'Active'],
    ['Activity', 'Sensor adjustment', 'Calibrate or reposition optical/magnetic sensors', 'Active'],
    ['Activity', 'Sensor replacement', 'Swap out defective sensor with new unit', 'Active'],
    ['Activity', 'Print head cleaning', 'Chemical cleaning of print nozzle array', 'Active'],
    ['Activity', 'Print head replacement', 'Install replacement thermal/flexo print head', 'Active'],
    ['Activity', 'Belt replacement', 'Fit and tension new drive belt', 'Active'],
    ['Activity', 'Motor checking', 'Measure winding resistance and temperature', 'Active'],
    ['Activity', 'Software restart', 'Reboot PLC / controller software', 'Active'],
    ['Activity', 'Electrical connection checking', 'Inspect terminal blocks and wiring harnesses', 'Active'],
    ['Activity', 'Machine alignment', 'Optical and mechanical leveling alignment', 'Active'],
    ['Activity', 'RFID reader replacement', 'Replace RFID interrogator head', 'Active'],
    ['Activity', 'Calibration', 'Standard gauge recalibration', 'Active'],
    ['Activity', 'Troubleshooting', 'Diagnostic fault tracing', 'Active'],
    ['Activity', 'Cleaning', 'General deep cleaning and debris removal', 'Active'],
    ['Activity', 'Other', 'Custom maintenance activity', 'Active'],
    ['SparePart', 'Sensor', '45.00', 'Active'],
    ['SparePart', 'Motor', '180.00', 'Active'],
    ['SparePart', 'Bearing', '25.00', 'Active'],
    ['SparePart', 'Belt', '35.00', 'Active'],
    ['SparePart', 'Print Head', '220.00', 'Active'],
    ['SparePart', 'RFID Reader', '310.00', 'Active'],
    ['SparePart', 'Cable', '15.00', 'Active'],
    ['SparePart', 'Power Supply', '95.00', 'Active'],
    ['SparePart', 'Software Service', '150.00', 'Active'],
    ['SparePart', 'External Technician Service', '200.00', 'Active'],
    ['SparePart', 'Other', '0.00', 'Active'],
    ['UOM', 'PCS', 'Pieces', 'Active'],
    ['UOM', 'SET', 'Set of items', 'Active'],
    ['UOM', 'METER', 'Meters', 'Active'],
    ['UOM', 'KG', 'Kilograms', 'Active'],
    ['UOM', 'LITER', 'Liters', 'Active'],
    ['UOM', 'HOUR', 'Hours of service', 'Active'],
    ['UOM', 'SERVICE', 'Single service event', 'Active'],
    ['UOM', 'OTHER', 'Other unit', 'Active']
  ],
  FiveS_Assessments: [
    [
      'Assessment_ID', 'Date', 'Month', 'Period', 'Employee_ID', 'Employee_Name', 
      'Department', 'Section', 'Designation', 'Supervisor_Name', 'Manager_Name', 
      'Shift', 'Assessor_ID', 'Assessor_Name', 'Frequency', 'Sort_Score', 
      'SetInOrder_Score', 'Shine_Score', 'Standardize_Score', 'Sustain_Score', 
      'Total_5S_Score', 'Visual_Management_Score', 'Final_Score', 'Rating', 
      'Checklist_JSON', 'Remarks', 'Corrective_Actions_Count', 'Critical_Violations_Count', 
      'Status', 'Created_By', 'Created_At', 'Updated_By', 'Updated_At'
    ],
    [
      '5S-2026-08-001', '2026-08-15', '2026-08', '2026-08', 'EMP001', 'John Doe',
      'Cutting', 'Floor 1', 'Senior Operator', 'Sarah Connor', 'Michael Scott',
      'Day Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '95',
      '95', '98', '92', '96',
      '95', '96', '95', 'Excellent',
      '[]', 'Exceptional workspace order and pristine cutter maintenance. High Kaizen participation.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-15T09:30:00.000Z', 'noor.alam1750@gmail.com', '2026-08-15T10:00:00.000Z'
    ],
    [
      '5S-2026-08-002', '2026-08-15', '2026-08', '2026-08', 'EMP002', 'Jane Smith',
      'Sewing', 'Floor 2', 'Quality Inspector', 'Sarah Connor', 'Michael Scott',
      'Day Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '92',
      '94', '95', '90', '93',
      '93', '94', '93', 'Excellent',
      '[]', 'Very neat inspection table, color-coded shade tags, and 30-second tool retrieval adhered to.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-15T10:15:00.000Z', 'noor.alam1750@gmail.com', '2026-08-15T10:45:00.000Z'
    ],
    [
      '5S-2026-08-003', '2026-08-16', '2026-08', '2026-08', 'EMP003', 'Alex Johnson',
      'Finishing', 'Floor 3', 'Finishing Lead', 'Sarah Connor', 'Michael Scott',
      'Night Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '88',
      '90', '88', '86', '88',
      '88', '90', '89', 'Very Good',
      '[]', 'Good aisle maintenance. Slight clutter near packing staging area addressed immediately.', '1', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-16T11:00:00.000Z', 'noor.alam1750@gmail.com', '2026-08-16T11:30:00.000Z'
    ],
    [
      '5S-2026-08-004', '2026-08-16', '2026-08', '2026-08', 'EMP004', 'Robert Brown',
      'Packaging', 'Floor 1', 'Packaging Specialist', 'Sarah Connor', 'Michael Scott',
      'General', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '82',
      '80', '85', '84', '80',
      '82', '84', '83', 'Very Good',
      '[]', 'Tape dispensers and strapping rolls returned to designated racks. Carton waste managed well.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-16T13:45:00.000Z', 'noor.alam1750@gmail.com', '2026-08-16T14:15:00.000Z'
    ],
    [
      '5S-2026-08-005', '2026-08-17', '2026-08', '2026-08', 'EMP005', 'Emily Davis',
      'Maintenance', 'Workshop', 'Maintenance Tech', 'Sarah Connor', 'Michael Scott',
      'Night Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '90',
      '92', '90', '88', '92',
      '90', '92', '91', 'Excellent',
      '[]', 'Workshop tool shadows, grease rag bins, and electrical safety signage maintained at high standard.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-17T09:00:00.000Z', 'noor.alam1750@gmail.com', '2026-08-17T09:30:00.000Z'
    ],
    [
      '5S-2026-08-006', '2026-08-17', '2026-08', '2026-08', 'EMP006', 'David Wilson',
      'Cutting', 'Floor 1', 'Pattern Maker', 'Sarah Connor', 'Michael Scott',
      'Day Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '84',
      '86', '82', '80', '84',
      '83', '85', '84', 'Very Good',
      '[]', 'Pattern sheets organized on vertical hanging racks. Scrap fabric removed from cutting table.', '1', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-08-17T11:15:00.000Z', 'noor.alam1750@gmail.com', '2026-08-17T11:45:00.000Z'
    ],
    // Previous month (2026-07) for historical trends & tie breaker reference
    [
      '5S-2026-07-001', '2026-07-20', '2026-07', '2026-07', 'EMP001', 'John Doe',
      'Cutting', 'Floor 1', 'Senior Operator', 'Sarah Connor', 'Michael Scott',
      'Day Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '92',
      '93', '95', '90', '94',
      '93', '94', '93', 'Excellent',
      '[]', 'Great baseline 5S performance.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-07-20T09:30:00.000Z', 'noor.alam1750@gmail.com', '2026-07-20T10:00:00.000Z'
    ],
    [
      '5S-2026-07-002', '2026-07-20', '2026-07', '2026-07', 'EMP002', 'Jane Smith',
      'Sewing', 'Floor 2', 'Quality Inspector', 'Sarah Connor', 'Michael Scott',
      'Day Shift', 'ADMIN-001', 'Md. Noor Alam', 'Monthly', '90',
      '92', '92', '88', '90',
      '90', '92', '91', 'Excellent',
      '[]', 'Well-kept inspection zone.', '0', '0',
      'Approved', 'noor.alam1750@gmail.com', '2026-07-20T10:15:00.000Z', 'noor.alam1750@gmail.com', '2026-07-20T10:45:00.000Z'
    ]
  ],
  FiveS_CorrectiveActions: [
    [
      'Action_ID', 'Assessment_ID', 'Employee_ID', 'Employee_Name', 'Department', 
      'Category', 'Observation', 'Non_Conformance', 'Root_Cause', 
      'Corrective_Action', 'Responsible_Person', 'Target_Date', 'Status', 
      'Closure_Date', 'Closed_By', 'Verification_Notes', 'Before_Photo', 
      'After_Photo', 'Created_By', 'Created_At', 'Updated_At'
    ],
    [
      'ACT-2026-001', '5S-2026-08-003', 'EMP003', 'Alex Johnson', 'Finishing',
      'sort', 'Excess cartons obstructing pedestrian yellow line aisle.', 'Aisle blocked with unsorted packaging bins.', 'Temporary surge in export orders without dedicated staging zone.',
      'Mark temporary overflow staging square and clear aisle immediately.', 'Alex Johnson', '2026-08-20', 'Closed',
      '2026-08-19', 'Sarah Connor', 'Aisle fully cleared and demarcated properly with yellow floor tape.', '',
      '', 'noor.alam1750@gmail.com', '2026-08-16T11:05:00.000Z', '2026-08-19T14:30:00.000Z'
    ],
    [
      'ACT-2026-002', '5S-2026-08-006', 'EMP006', 'David Wilson', 'Cutting',
      'setInOrder', 'Missing label on ruler and shears holder rack.', 'Tools hung in random hooks.', 'Labels peeled off after solvent cleaning.',
      'Re-apply laminated durable labels on shadow board hooks.', 'David Wilson', '2026-08-25', 'In Progress',
      '', '', 'Laminated labels prepared, awaiting mounting.', '',
      '', 'noor.alam1750@gmail.com', '2026-08-17T11:20:00.000Z', '2026-08-18T16:00:00.000Z'
    ]
  ],
  FiveS_Winners: [
    [
      'Winner_ID', 'Month', 'Rank', 'Employee_ID', 'Employee_Name', 
      'Department', 'Section', 'Designation', 'Total_5S_Score', 'Visual_Score', 
      'Final_Score', 'Rating', 'Declared_By', 'Declared_At', 'Remarks'
    ],
    [
      'WIN-2026-07-1', '2026-07', '1', 'EMP001', 'John Doe',
      'Cutting', 'Floor 1', 'Senior Operator', '93', '94',
      '93', 'Excellent', 'Md. Noor Alam', '2026-07-31T18:00:00.000Z', '1st Place Gold Champion - Outstanding 5S standards maintained all month.'
    ],
    [
      'WIN-2026-07-2', '2026-07', '2', 'EMP002', 'Jane Smith',
      'Sewing', 'Floor 2', 'Quality Inspector', '90', '92',
      '91', 'Excellent', 'Md. Noor Alam', '2026-07-31T18:00:00.000Z', '2nd Place Silver - Immaculate quality table and inspection tools order.'
    ],
    [
      'WIN-2026-07-3', '2026-07', '3', 'EMP005', 'Emily Davis',
      'Maintenance', 'Workshop', 'Maintenance Tech', '89', '90',
      '89', 'Very Good', 'Md. Noor Alam', '2026-07-31T18:00:00.000Z', '3rd Place Bronze - Exemplary machine maintenance workshop housekeeping.'
    ]
  ],
  FiveS_AuditLog: [
    [
      'Log_ID', 'Timestamp', 'Date', 'Time', 'User_ID', 'User_Name', 
      'User_Role', 'Action', 'Target_Type', 'Target_ID', 'Details'
    ],
    [
      '5S-AUD-001', '2026-08-15T10:00:00.000Z', '2026-08-15', '10:00:00', 'ADMIN-001', 'Md. Noor Alam',
      'Admin', 'Assessment Approved', 'Assessment', '5S-2026-08-001', 'Approved 5S assessment for EMP001 (John Doe) with score 95% (Excellent).'
    ]
  ]
};

// Standard Shifts
export const STANDARD_SHIFTS: string[][] = [
  ['Shift_ID', 'Shift_Name', 'Start_Time', 'End_Time', 'Status'],
  ['SHF-001', 'Day Shift', '09:00', '18:00', 'Active'],
  ['SHF-002', 'Night Shift', '20:00', '05:00', 'Active'],
  ['SHF-003', 'General', '09:00', '18:00', 'Active']
];

// Local storage storage helper
function getLocalSheet(sheetName: string): string[][] {
  const cleanName = sheetName.split('!')[0].trim();
  const stored = localStorage.getItem(`erp_db_${cleanName}`);
  if (stored) {
    try {
      const parsed: string[][] = JSON.parse(stored);
      // Auto-upgrade legacy shift names if stored
      if (cleanName === 'Shifts' && Array.isArray(parsed) && parsed.length > 0) {
        const hasLegacy = parsed.some(row => 
          row[1]?.toLowerCase().includes('day') || 
          row[1]?.toLowerCase().includes('night')
        );
        if (hasLegacy || parsed.length <= 1) {
          localStorage.setItem(`erp_db_Shifts`, JSON.stringify(STANDARD_SHIFTS));
          return STANDARD_SHIFTS;
        }
      }
      return parsed;
    } catch {
      // Fallback
    }
  }
  const initial = DEFAULT_LOCAL_DB[cleanName] || [];
  localStorage.setItem(`erp_db_${cleanName}`, JSON.stringify(initial));
  return initial;
}

function setLocalSheet(sheetName: string, data: string[][]): void {
  const cleanName = sheetName.split('!')[0].trim();
  localStorage.setItem(`erp_db_${cleanName}`, JSON.stringify(data));
}

function isLocalStorageDb(spreadsheetId: string | null, token?: string | null): boolean {
  if (!spreadsheetId || spreadsheetId === 'local-storage-db') return true;
  if (!token || token === 'mock-token-for-admin') return true;
  return false;
}

export async function createSpreadsheet(): Promise<string> {
  const token = await getAccessToken();
  
  if (!token || token === 'mock-token-for-admin') {
    // Initialize Local Storage Database
    for (const [sheet, data] of Object.entries(DEFAULT_LOCAL_DB)) {
      setLocalSheet(sheet, data);
    }
    return 'local-storage-db';
  }

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'ERP/HRMS Database',
        },
        sheets: [
          { properties: { title: 'Users' } },
          { properties: { title: 'Employees' } },
          { properties: { title: 'MachineCapacity' } },
          { properties: { title: 'SkillMatrix' } },
          { properties: { title: 'Leave' } },
          { properties: { title: 'Overtime' } },
          { properties: { title: 'Holidays' } },
          { properties: { title: 'BestPractices' } },
          { properties: { title: 'Supervisors' } },
          { properties: { title: 'KPI' } },
          { properties: { title: 'KpiPrivacy' } },
          { properties: { title: 'Shifts' } },
          { properties: { title: 'ShiftAssignments' } },
          { properties: { title: 'ShiftHistory' } },
          { properties: { title: 'Tasks' } },
          { properties: { title: 'SettlementAuditLog' } },
          { properties: { title: 'BreakdownLog' } },
          { properties: { title: 'BreakdownAuditLog' } },
          { properties: { title: 'BreakdownSettings' } },
          { properties: { title: 'FiveS_Assessments' } },
          { properties: { title: 'FiveS_CorrectiveActions' } },
          { properties: { title: 'FiveS_Winners' } },
          { properties: { title: 'FiveS_AuditLog' } },
        ]
      })
    });

    if (!response.ok) {
      console.warn('Google Sheets create failed, initializing local database instead.');
      for (const [sheet, data] of Object.entries(DEFAULT_LOCAL_DB)) {
        setLocalSheet(sheet, data);
      }
      return 'local-storage-db';
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // Initialize headers and seed data
    const headers = [
      { range: 'Users!A1:E1', values: DEFAULT_LOCAL_DB.Users },
      { range: 'Employees!A1:Z7', values: DEFAULT_LOCAL_DB.Employees },
      { range: 'MachineCapacity!A1:Z9', values: DEFAULT_LOCAL_DB.MachineCapacity },
      { range: 'SkillMatrix!A1:C4', values: DEFAULT_LOCAL_DB.SkillMatrix },
      { range: 'Leave!A1:S7', values: DEFAULT_LOCAL_DB.Leave },
      { range: 'SettlementAuditLog!A1:L2', values: DEFAULT_LOCAL_DB.SettlementAuditLog },
      { range: 'Overtime!A1:G2', values: DEFAULT_LOCAL_DB.Overtime },
      { range: 'Holidays!A1:C3', values: DEFAULT_LOCAL_DB.Holidays },
      { range: 'BestPractices!A1:H2', values: DEFAULT_LOCAL_DB.BestPractices },
      { range: 'Supervisors!A1:C3', values: DEFAULT_LOCAL_DB.Supervisors },
      { range: 'KPI!A1:K9', values: DEFAULT_LOCAL_DB.KPI },
      { range: 'KpiPrivacy!A1:D2', values: DEFAULT_LOCAL_DB.KpiPrivacy },
      { range: 'Shifts!A1:E4', values: DEFAULT_LOCAL_DB.Shifts },
      { range: 'ShiftAssignments!A1:N1', values: DEFAULT_LOCAL_DB.ShiftAssignments },
      { range: 'ShiftHistory!A1:J7', values: DEFAULT_LOCAL_DB.ShiftHistory },
      { range: 'Tasks!A1:Z1', values: DEFAULT_LOCAL_DB.Tasks },
      { range: 'BreakdownLog!A1:AF5', values: DEFAULT_LOCAL_DB.BreakdownLog },
      { range: 'BreakdownAuditLog!A1:J5', values: DEFAULT_LOCAL_DB.BreakdownAuditLog },
      { range: 'BreakdownSettings!A1:D55', values: DEFAULT_LOCAL_DB.BreakdownSettings },
      { range: 'FiveS_Assessments!A1:AG9', values: DEFAULT_LOCAL_DB.FiveS_Assessments },
      { range: 'FiveS_CorrectiveActions!A1:U3', values: DEFAULT_LOCAL_DB.FiveS_CorrectiveActions },
      { range: 'FiveS_Winners!A1:O4', values: DEFAULT_LOCAL_DB.FiveS_Winners },
      { range: 'FiveS_AuditLog!A1:K2', values: DEFAULT_LOCAL_DB.FiveS_AuditLog },
    ];

    for (const header of headers) {
      await updateRange(spreadsheetId, header.range, header.values).catch(e => console.warn('Header init error:', e));
    }

    return spreadsheetId;
  } catch (error) {
    console.warn('Google API network error, defaulting to local database:', error);
    for (const [sheet, data] of Object.entries(DEFAULT_LOCAL_DB)) {
      setLocalSheet(sheet, data);
    }
    return 'local-storage-db';
  }
}

const rangeCache = new Map<string, { data: string[][], timestamp: number, promise?: Promise<string[][]> }>();
const CACHE_TTL = 15000; // 15 seconds

export function invalidateCache(spreadsheetId: string, sheetMatch?: string) {
  if (!sheetMatch) {
    rangeCache.clear();
    return;
  }
  const prefix1 = `${spreadsheetId}-${sheetMatch}`;
  const prefix2 = `${spreadsheetId}-${sheetMatch}!`;
  for (const key of rangeCache.keys()) {
    if (key === prefix1 || key.startsWith(prefix2)) {
      rangeCache.delete(key);
    }
  }
}

export async function getRange(spreadsheetId: string, range: string): Promise<string[][]> {
  const token = await getAccessToken();
  const sheetName = range.split('!')[0].trim();

  // If local storage mode or mock token, read from local DB
  if (isLocalStorageDb(spreadsheetId, token)) {
    return getLocalSheet(sheetName);
  }

  const cacheKey = `${spreadsheetId}-${range}`;
  const cached = rangeCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    if (cached.promise) return cached.promise;
    return cached.data;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        rangeCache.delete(cacheKey);
        if (response.status === 401) {
          console.warn('Auth expired, using local cache fallback');
          return getLocalSheet(sheetName);
        }
        if (response.status === 404 || response.status === 403) {
          console.warn(`Spreadsheet ${spreadsheetId} inaccessible (${response.status}), falling back to local database.`);
          return getLocalSheet(sheetName);
        }
        return getLocalSheet(sheetName);
      }

      const data = await response.json();
      const result = data.values || [];
      rangeCache.set(cacheKey, { data: result, timestamp: Date.now() });
      // Keep local store in sync
      if (result.length > 0) {
        setLocalSheet(sheetName, result);
      }
      return result;
    } catch (err) {
      console.warn(`Fetch failed for ${range}, falling back to local database:`, err);
      return getLocalSheet(sheetName);
    }
  })();

  rangeCache.set(cacheKey, { data: [], timestamp: Date.now(), promise });
  return promise;
}

export async function appendRow(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const sheetName = range.split('!')[0].trim();
  invalidateCache(spreadsheetId, sheetName);
  const token = await getAccessToken();

  // Local storage write
  const currentLocal = getLocalSheet(sheetName);
  const updatedLocal = [...currentLocal, ...values];
  setLocalSheet(sheetName, updatedLocal);

  // Notify any active listeners across the app
  try {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName } }));
  } catch (e) {
    // Ignore event dispatch errors
  }

  if (isLocalStorageDb(spreadsheetId, token)) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values
      })
    });

    if (!response.ok) {
      console.warn('Google Sheets append row returned non-OK, local write preserved.');
    }
  } catch (err) {
    console.warn('Google Sheets append row network error, local write preserved:', err);
  }
}

export async function updateRange(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const sheetName = range.split('!')[0].trim();
  invalidateCache(spreadsheetId, sheetName);
  const token = await getAccessToken();

  // Sync with local storage
  const currentLocal = getLocalSheet(sheetName);
  if (!range.includes('!') || range.endsWith('!A1:Z') || range.endsWith('!A:Z')) {
    setLocalSheet(sheetName, values);
  } else {
    // Specific row or range updates e.g. MachineCapacity!A2:T2
    const rangePart = range.includes('!') ? range.split('!')[1] : range;
    const match = rangePart.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/i);
    if (match) {
      const startRowIdx = parseInt(match[2], 10) - 1; // 1-indexed to 0-indexed
      values.forEach((valRow, idx) => {
        const targetRowIdx = startRowIdx + idx;
        if (targetRowIdx < currentLocal.length) {
          const existingRow = currentLocal[targetRowIdx] ? [...currentLocal[targetRowIdx]] : [];
          valRow.forEach((cellVal, cellIdx) => {
            existingRow[cellIdx] = cellVal;
          });
          currentLocal[targetRowIdx] = existingRow;
        } else {
          currentLocal.push(valRow);
        }
      });
      setLocalSheet(sheetName, currentLocal);
    }
  }

  // Notify any active listeners across the app
  try {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName } }));
  } catch (e) {
    // Ignore event dispatch errors
  }

  if (isLocalStorageDb(spreadsheetId, token)) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values
      })
    });

    if (!response.ok) {
      console.warn('Google Sheets update range returned non-OK, local write preserved.');
    }
  } catch (err) {
    console.warn('Google Sheets update range network error:', err);
  }
}

// Utility to find and update a row based on a primary key (assuming key is in column A)
export async function updateRowByPrimaryKey(spreadsheetId: string, sheetName: string, primaryKey: string, newValues: string[]): Promise<void> {
  invalidateCache(spreadsheetId, sheetName);
  const token = await getAccessToken();

  // Local storage update
  const currentLocal = getLocalSheet(sheetName);
  const rowIndex = currentLocal.findIndex(row => String(row[0] || '').trim().toUpperCase() === primaryKey.trim().toUpperCase());
  if (rowIndex !== -1) {
    currentLocal[rowIndex] = newValues;
    setLocalSheet(sheetName, currentLocal);
  } else {
    currentLocal.push(newValues);
    setLocalSheet(sheetName, currentLocal);
  }

  // Notify any active listeners across the app
  try {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName } }));
  } catch (e) {
    // Ignore event dispatch errors
  }

  if (isLocalStorageDb(spreadsheetId, token)) {
    return;
  }

  try {
    const data = await getRange(spreadsheetId, `${sheetName}!A:Z`);
    const remoteRowIndex = data.findIndex(row => String(row[0] || '').trim().toUpperCase() === primaryKey.trim().toUpperCase());
    
    if (remoteRowIndex !== -1) {
      const sheetRowNumber = remoteRowIndex + 1;
      const numCols = newValues.length;
      const endColLetter = String.fromCharCode(65 + numCols - 1);
      const range = `${sheetName}!A${sheetRowNumber}:${endColLetter}${sheetRowNumber}`;
      await updateRange(spreadsheetId, range, [newValues]);
    } else {
      await appendRow(spreadsheetId, `${sheetName}!A:Z`, [newValues]);
    }
  } catch (err) {
    console.warn('Google Sheets remote update failed, local copy was updated:', err);
  }
}

export async function deleteRowByPrimaryKey(spreadsheetId: string, sheetName: string, primaryKey: string): Promise<void> {
  invalidateCache(spreadsheetId, sheetName);
  const token = await getAccessToken();

  // Local storage delete
  const currentLocal = getLocalSheet(sheetName);
  const filteredLocal = currentLocal.filter(row => String(row[0] || '').trim().toUpperCase() !== primaryKey.trim().toUpperCase());
  setLocalSheet(sheetName, filteredLocal);

  // Notify any active listeners across the app
  try {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { sheetName } }));
  } catch (e) {
    // Ignore event dispatch errors
  }

  if (isLocalStorageDb(spreadsheetId, token)) {
    return;
  }

  try {
    const data = await getRange(spreadsheetId, `${sheetName}!A:Z`);
    const rowIndex = data.findIndex(row => String(row[0] || '').trim().toUpperCase() === primaryKey.trim().toUpperCase());
    
    if (rowIndex === -1) return;

    const metaResponse = await fetch(`${BASE_URL}/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!metaResponse.ok) return;
    const metaData = await metaResponse.json();
    const sheet = metaData.sheets.find((s: any) => s.properties.title === sheetName);
    
    if (!sheet) return;
    const sheetId = sheet.properties.sheetId;

    await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      })
    });
  } catch (err) {
    console.warn('Google Sheets remote delete failed, local copy was removed:', err);
  }
}

export async function ensureSheetExists(spreadsheetId: string, sheetName: string, headers: string[]): Promise<void> {
  const localData = getLocalSheet(sheetName);
  if (localData.length === 0) {
    setLocalSheet(sheetName, [headers]);
  }

  const token = await getAccessToken();
  if (isLocalStorageDb(spreadsheetId, token)) return;

  try {
    const getResponse = await fetch(`${BASE_URL}/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!getResponse.ok) return;
    const data = await getResponse.json();
    const exists = data.sheets.some((s: any) => s.properties.title === sheetName);

    if (!exists) {
      const addResponse = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        })
      });
      
      if (addResponse.ok) {
        await appendRow(spreadsheetId, `${sheetName}!A1`, [headers]);
      }
    }
  } catch (err) {
    console.warn(`ensureSheetExists (${sheetName}) remote check skipped:`, err);
  }
}

export const KPI_HEADERS = ['KPI_ID', 'Employee_ID', 'Employee_Name', 'Department', 'Month', 'Date', 'Plan', 'Achievement', 'Rating', 'Created_At', 'Updated_At'];
export const KPI_PRIVACY_HEADERS = ['Employee_ID', 'Hidden_By', 'Hidden_At', 'Reason'];

export async function ensureKpiSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetExists(spreadsheetId, 'KPI', KPI_HEADERS);
}

export async function ensureKpiPrivacySheet(spreadsheetId: string): Promise<void> {
  await ensureSheetExists(spreadsheetId, 'KpiPrivacy', KPI_PRIVACY_HEADERS);
}

export async function getHiddenKpiEmployeeIds(spreadsheetId: string): Promise<string[]> {
  try {
    // Check localStorage cache first
    const cached = localStorage.getItem('erp_hidden_kpi_employee_ids');
    let localList: string[] = [];
    if (cached) {
      try {
        localList = JSON.parse(cached);
      } catch {
        localList = [];
      }
    }

    await ensureKpiPrivacySheet(spreadsheetId);
    const rows = await getRange(spreadsheetId, 'KpiPrivacy!A:D');
    if (rows && rows.length > 1) {
      const ids = rows.slice(1).map(r => String(r[0] || '').trim().toUpperCase()).filter(Boolean);
      const combined = Array.from(new Set([...localList.map(s => s.toUpperCase()), ...ids]));
      localStorage.setItem('erp_hidden_kpi_employee_ids', JSON.stringify(combined));
      return combined;
    }
    return localList;
  } catch (err) {
    console.warn('Failed to fetch hidden KPI list from sheets, using local storage cache:', err);
    const cached = localStorage.getItem('erp_hidden_kpi_employee_ids');
    return cached ? JSON.parse(cached) : ['EMP003'];
  }
}

export async function saveHiddenKpiEmployeeIds(spreadsheetId: string, employeeIds: string[], userEmail = 'Admin'): Promise<void> {
  const normalizedIds = Array.from(new Set(employeeIds.map(id => id.trim().toUpperCase()))).filter(Boolean);
  // Synchronize local storage
  localStorage.setItem('erp_hidden_kpi_employee_ids', JSON.stringify(normalizedIds));

  // Build sheet rows
  const now = new Date().toISOString();
  const rows: string[][] = [
    KPI_PRIVACY_HEADERS,
    ...normalizedIds.map(id => [id, userEmail, now, 'Hidden by Admin'])
  ];

  await updateRange(spreadsheetId, 'KpiPrivacy!A1:D', rows);
}

export async function toggleHiddenKpiEmployeeId(spreadsheetId: string, employeeId: string, userEmail = 'Admin'): Promise<string[]> {
  const current = await getHiddenKpiEmployeeIds(spreadsheetId);
  const targetId = employeeId.trim().toUpperCase();
  let updated: string[];
  if (current.includes(targetId)) {
    updated = current.filter(id => id !== targetId);
  } else {
    updated = [...current, targetId];
  }
  await saveHiddenKpiEmployeeIds(spreadsheetId, updated, userEmail);
  return updated;
}

