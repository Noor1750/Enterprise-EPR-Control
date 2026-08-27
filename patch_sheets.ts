import fs from 'fs';

let content = fs.readFileSync('src/lib/sheets.ts', 'utf-8');

const cacheCode = `
const rangeCache = new Map<string, { data: string[][], timestamp: number, promise?: Promise<string[][]> }>();
const CACHE_TTL = 30000; // 30 seconds

export function invalidateCache(spreadsheetId: string, sheetMatch?: string) {
  if (!sheetMatch) {
    rangeCache.clear();
    return;
  }
  const prefix1 = \`\${spreadsheetId}-\${sheetMatch}\`;
  const prefix2 = \`\${spreadsheetId}-\${sheetMatch}!\`;
  for (const key of rangeCache.keys()) {
    if (key === prefix1 || key.startsWith(prefix2)) {
      rangeCache.delete(key);
    }
  }
}
`;

content = content.replace("export async function getRange", cacheCode + "\nexport async function getRange");

const getRangeReplacement = `export async function getRange(spreadsheetId: string, range: string): Promise<string[][]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const cacheKey = \`\${spreadsheetId}-\${range}\`;
  const cached = rangeCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    if (cached.promise) return cached.promise;
    return cached.data;
  }

  const promise = (async () => {
    const response = await fetch(\`\${BASE_URL}/\${spreadsheetId}/values/\${range}\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errText = await response.text();
      rangeCache.delete(cacheKey);
      if (response.status === 401) {
        window.dispatchEvent(new Event('force-logout'));
        throw new Error('Authentication expired. Please log in again.');
      }
      if (response.status === 404) {
        window.dispatchEvent(new Event('database-not-found'));
        throw new Error('Database (Spreadsheet) not found or access denied. It may have been deleted.');
      }
      throw new Error(\`Failed to get range \${range}: \${response.status} \${errText}\`);
    }

    const data = await response.json();
    const result = data.values || [];
    rangeCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  })();

  rangeCache.set(cacheKey, { data: [], timestamp: Date.now(), promise });
  return promise;
}`;

content = content.replace(/export async function getRange[\s\S]*?return data\.values \|\| \[\];\n}/m, getRangeReplacement);

content = content.replace(
  /export async function appendRow\(spreadsheetId: string, range: string, values: string\[\]\[\]\): Promise<void> \{/g,
  "export async function appendRow(spreadsheetId: string, range: string, values: string[][]): Promise<void> {\n  invalidateCache(spreadsheetId, range.split('!')[0]);"
);

content = content.replace(
  /export async function updateRange\(spreadsheetId: string, range: string, values: string\[\]\[\]\): Promise<void> \{/g,
  "export async function updateRange(spreadsheetId: string, range: string, values: string[][]): Promise<void> {\n  invalidateCache(spreadsheetId, range.split('!')[0]);"
);

content = content.replace(
  /export async function deleteRowByPrimaryKey\(spreadsheetId: string, sheetName: string, primaryKey: string\): Promise<void> \{/g,
  "export async function deleteRowByPrimaryKey(spreadsheetId: string, sheetName: string, primaryKey: string): Promise<void> {\n  invalidateCache(spreadsheetId, sheetName);"
);

fs.writeFileSync('src/lib/sheets.ts', content);
