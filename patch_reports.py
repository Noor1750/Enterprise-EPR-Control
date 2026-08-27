import re

with open('src/components/Reports.tsx', 'r') as f:
    content = f.read()

# Update headers
headers_block = r"""    const headers = \['SL', 'ID No', 'Employee Name', 'Designation', 'Section'\];
    for \(let i = 1; i <= 31; i\+\+\) \{
      headers\.push\(i\.toString\(\)\);
    \}"""

headers_repl = r"""    const headers = ['SL', 'ID No', 'Employee Name', 'Designation', 'Section'];
    for (let i = 1; i <= 31; i++) {
      headers.push(i.toString());
    }
    headers.push('Total Hours', 'OT Rate', 'Payable Amount');"""

content = re.sub(headers_block, headers_repl, content)

# Update row processing
row_block = r"""      for \(let i = 1; i <= 31; i\+\+\) row\.push\(''\);
      const empOt = otData\.filter\(ot => ot\[2\] === id && ot\[1\] && ot\[1\]\.startsWith\(month\)\);
      empOt\.forEach\(ot => \{
        const d = parseInt\(ot\[1\]\.split\('-'\)\[2\], 10\);
        if \(d >= 1 && d <= 31\) \{
          const currentVal = row\[d \+ 4\];
          const addVal = parseFloat\(ot\[6\] \|\| '0'\);
          if \(addVal > 0\) \{
            row\[d \+ 4\] = currentVal \? \(parseFloat\(currentVal as string\) \+ addVal\)\.toString\(\) : addVal\.toString\(\);
          \}
        \}
      \}\);
      rows\.push\(row\);"""

row_repl = r"""      for (let i = 1; i <= 31; i++) row.push('');
      const empOt = otData.filter(ot => ot[2] === id && ot[1] && ot[1].startsWith(month));
      let totalHours = 0;
      empOt.forEach(ot => {
        const d = parseInt(ot[1].split('-')[2], 10);
        if (d >= 1 && d <= 31) {
          const currentVal = row[d + 4];
          const addVal = parseFloat(ot[6] || '0');
          if (addVal > 0) {
            row[d + 4] = currentVal ? (parseFloat(currentVal as string) + addVal).toString() : addVal.toString();
            totalHours += addVal;
          }
        }
      });
      const otRate = parseFloat(emp[8] || '0');
      const payableAmount = totalHours * otRate;
      row.push(totalHours > 0 ? totalHours.toString() : '');
      row.push(otRate > 0 ? otRate.toString() : '');
      row.push(payableAmount > 0 ? payableAmount.toString() : '');
      
      rows.push(row);"""

content = re.sub(row_block, row_repl, content)

with open('src/components/Reports.tsx', 'w') as f:
    f.write(content)
