import re

with open('src/components/OvertimeCalendar.tsx', 'r') as f:
    content = f.read()

# Modify map initialization to include otRate
init_block = r"""      empOtMap.set(empId, {
        id: empId,
        name: ot\[3\],
        designation: ot\[4\],
        section: ot\[5\],
        days: {} as Record<number, number>,
        total: 0
      });"""

replacement_block = r"""      const empData = employees.find((e: any) => e[0] === empId) || allEmployees.find((e: any) => e[0] === empId);
      const otRate = parseFloat(empData?.[8] || '0');
      empOtMap.set(empId, {
        id: empId,
        name: ot[3],
        designation: ot[4],
        section: ot[5],
        days: {} as Record<number, number>,
        total: 0,
        otRate: otRate
      });"""

content = re.sub(init_block, replacement_block, content)

# Modify Total header
content = content.replace(
    '<th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">Total</th>',
    '<th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">Total Hours</th>\n              <th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">OT Rate</th>\n              <th className="px-3 py-2 border text-center text-[13px] font-semibold text-[#73879C]">Payable Amount</th>'
)

# Modify row rendering
row_block = r"""<td className="px-3 py-2 border text-center text-sm font-bold text-\[#73879C\]">\{row\.total\}</td>"""
row_replacement = r"""<td className="px-3 py-2 border text-center text-sm font-bold text-[#73879C]">{row.total}</td>
                <td className="px-3 py-2 border text-center text-sm text-[#73879C]">{row.otRate.toFixed(2)}</td>
                <td className="px-3 py-2 border text-center text-sm font-bold text-[#73879C]">{(row.total * row.otRate).toFixed(2)}</td>"""

content = re.sub(row_block, row_replacement, content)

# Also update colSpan if needed
content = re.sub(r'colSpan=\{6 \+ daysInMonth.length\}', 'colSpan={8 + daysInMonth.length}', content)

with open('src/components/OvertimeCalendar.tsx', 'w') as f:
    f.write(content)
