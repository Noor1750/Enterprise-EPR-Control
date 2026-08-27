const fs = require('fs');
let code = fs.readFileSync('src/components/security/SecurityAuditLogModal.tsx', 'utf8');

const importOrig = `import { getSecurityAuditLogs, SecurityAuditLogEntry } from '../../lib/security';`;
const importNew = `import { getSecurityAuditLogs, SecurityAuditLogEntry, formatEmailToName } from '../../lib/security';`;

code = code.replace(importOrig, importNew);

const exportOrig = `      \`"\${l.adminEmail}"\`,
      \`"\${l.targetUser}"\`,`;
const exportNew = `      \`"\${formatEmailToName(l.adminEmail)}"\`,
      \`"\${formatEmailToName(l.targetUser)}"\`,`;

code = code.replace(exportOrig, exportNew);

const filterOrig = `      l.adminEmail.toLowerCase().includes(q) ||
      l.targetUser.toLowerCase().includes(q) ||`;
const filterNew = `      l.adminEmail.toLowerCase().includes(q) ||
      formatEmailToName(l.adminEmail).toLowerCase().includes(q) ||
      l.targetUser.toLowerCase().includes(q) ||
      formatEmailToName(l.targetUser).toLowerCase().includes(q) ||`;

code = code.replace(filterOrig, filterNew);

const displayOrig = `                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {l.adminEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700">{l.adminEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {l.targetUser}
                    </td>`;
const displayNew = `                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {formatEmailToName(l.adminEmail).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-medium text-slate-700">{formatEmailToName(l.adminEmail)}</span>
                           <span className="text-[10px] text-slate-400">{l.adminEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 flex flex-col">
                      <span className="font-medium text-slate-700">{formatEmailToName(l.targetUser)}</span>
                      <span className="text-[10px] text-slate-400">{l.targetUser}</span>
                    </td>`;

code = code.replace(displayOrig, displayNew);

fs.writeFileSync('src/components/security/SecurityAuditLogModal.tsx', code);
