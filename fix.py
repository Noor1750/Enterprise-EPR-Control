content1 = open('src/components/EmployeeDirectory.tsx').read()
content1 = content1.replace("import XLSX from 'xlsx';", "import * as XLSX from 'xlsx';")
content1 = content1.replace("const getXlsx = () => XLSX.utils ? XLSX : (XLSX as any).default;", "const getXlsx = () => XLSX;")
open('src/components/EmployeeDirectory.tsx', 'w').write(content1)

content2 = open('src/components/Reports.tsx').read()
content2 = content2.replace("import XLSX from 'xlsx';", "import * as XLSX from 'xlsx';")
content2 = content2.replace("const getXlsx = () => XLSX.utils ? XLSX : (XLSX as any).default;", "const getXlsx = () => XLSX;")
open('src/components/Reports.tsx', 'w').write(content2)
