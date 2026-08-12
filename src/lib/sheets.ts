import { getAccessToken } from './firebase';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function createSpreadsheet(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

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
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create spreadsheet');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Now, initialize the headers for each sheet
  const headers = [
    { range: 'Users!A1:E1', values: [['Username', 'Password_Hash', 'Role', 'Status', 'Access_Level']] },
    { range: 'Employees!A1:N1', values: [['ID_No', 'Name', 'Designation', 'Department', 'Date_of_Join', 'Current_Position', 'Supervisor_Name', 'Present_Salary', 'Overtime_Rate', 'Status', 'Inactive_Date', 'Phone', 'Emergency_Contact', 'Shift']] },
    { range: 'MachineCapacity!A1:D1', values: [['Machine_Name', 'No_of_Machine', 'Product_Type', 'Speed_Per_Hour']] },
    { range: 'SkillMatrix!A1:C1', values: [['ID_No', 'Machine_Job', 'Skill_Level']] },
    { range: 'Leave!A1:J1', values: [['Leave_ID', 'ID_No', 'Name', 'Designation', 'Department', 'From_Date', 'To_Date', 'Days', 'Status', 'Supervisor_Signoff']] },
    { range: 'Overtime!A1:G1', values: [['OT_ID', 'Date', 'ID_No', 'Name', 'Designation', 'Department', 'OT_Hours']] },
    { range: 'Holidays!A1:C1', values: [['Holiday_Date', 'Type', 'Description']] },
    { range: 'BestPractices!A1:H1', values: [['BP_ID', 'Date', 'ID_No', 'Name', 'Designation', 'Department', 'Details', 'Savings_USD']] },
    { range: 'Supervisors!A1:G1', values: [['ID_No', 'Level_1', 'Level_2', 'Level_3', 'Level_4', 'Level_5', 'Level_6']] },
  ];

  for (const header of headers) {
    await updateRange(spreadsheetId, header.range, header.values);
  }

  return spreadsheetId;
}

export async function getRange(spreadsheetId: string, range: string): Promise<string[][]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      window.dispatchEvent(new Event('force-logout'));
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 404) {
      window.dispatchEvent(new Event('database-not-found'));
      throw new Error('Database (Spreadsheet) not found or access denied. It may have been deleted.');
    }
    throw new Error(`Failed to get range ${range}: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.values || [];
}

export async function appendRow(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

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
    const errText = await response.text();
    if (response.status === 401) {
      window.dispatchEvent(new Event('force-logout'));
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 404) {
      window.dispatchEvent(new Event('database-not-found'));
      throw new Error('Database (Spreadsheet) not found or access denied. It may have been deleted.');
    }
    throw new Error(`Failed to append row to ${range}: ${response.status} ${errText}`);
  }
}

export async function updateRange(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

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
    const errText = await response.text();
    if (response.status === 401) {
      window.dispatchEvent(new Event('force-logout'));
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 404) {
      window.dispatchEvent(new Event('database-not-found'));
      throw new Error('Database (Spreadsheet) not found or access denied. It may have been deleted.');
    }
    throw new Error(`Failed to update range ${range}: ${response.status} ${errText}`);
  }
}

// Utility to find and update a row based on a primary key (assuming key is in column A)
export async function updateRowByPrimaryKey(spreadsheetId: string, sheetName: string, primaryKey: string, newValues: string[]): Promise<void> {
  const token = await getAccessToken();

  const data = await getRange(spreadsheetId, `${sheetName}!A:Z`);
  const rowIndex = data.findIndex(row => row[0] === primaryKey);
  
  if (rowIndex === -1) {
    throw new Error(`Row with key ${primaryKey} not found in ${sheetName}`);
  }

  // Row index is 0-based in JS, but 1-based in Sheets
  const sheetRowNumber = rowIndex + 1;
  const numCols = newValues.length;
  // Convert col index to letter (A, B, C...)
  const endColLetter = String.fromCharCode(65 + numCols - 1);
  const range = `${sheetName}!A${sheetRowNumber}:${endColLetter}${sheetRowNumber}`;

  await updateRange(spreadsheetId, range, [newValues]);
}

export async function ensureSheetExists(spreadsheetId: string, sheetName: string, headers: string[]): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Check if sheet exists
  const getResponse = await fetch(`${BASE_URL}/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!getResponse.ok) return;
  const data = await getResponse.json();
  const exists = data.sheets.some((s: any) => s.properties.title === sheetName);

  if (!exists) {
    // Add sheet
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
      // Add headers
      await appendRow(spreadsheetId, `${sheetName}!A1`, [headers]);
    }
  }
}

export async function deleteRowByPrimaryKey(spreadsheetId: string, sheetName: string, primaryKey: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // 1. Find the row
  const data = await getRange(spreadsheetId, `${sheetName}!A:Z`);
  const rowIndex = data.findIndex(row => row[0] === primaryKey);
  
  if (rowIndex === -1) {
    throw new Error(`Row with key ${primaryKey} not found in ${sheetName}`);
  }
  
  // To delete a row using REST API without batchUpdate, we can just clear it as a simpler approach, 
  // or we need to use batchUpdate with DeleteDimensionRequest. Let's use batchUpdate for actual deletion.
  // First, get the sheet ID (gid) for the sheetName
  const metaResponse = await fetch(`${BASE_URL}/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  const metaData = await metaResponse.json();
  const sheet = metaData.sheets.find((s: any) => s.properties.title === sheetName);
  
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  const sheetId = sheet.properties.sheetId;

  const batchUpdateResponse = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
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
              startIndex: rowIndex, // 0-based index
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    })
  });

  if (!batchUpdateResponse.ok) {
    const errText = await batchUpdateResponse.text();
    if (batchUpdateResponse.status === 401) {
      window.dispatchEvent(new Event('force-logout'));
      throw new Error('Authentication expired. Please log in again.');
    }
    if (batchUpdateResponse.status === 404) {
      window.dispatchEvent(new Event('database-not-found'));
      throw new Error('Database (Spreadsheet) not found or access denied. It may have been deleted.');
    }
    throw new Error(`Failed to delete row in ${sheetName}: ${batchUpdateResponse.status} ${errText}`);
  }
}
