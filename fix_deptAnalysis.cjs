const fs = require('fs');
let dash = fs.readFileSync('src/components/SkillMatrixDashboard.tsx', 'utf8');

dash = dash.replace('deptAnalysis, multiCategories: dAnalysis', 'deptAnalysis: dAnalysis');
dash = dash.replace('<BarChart data={deptAnalysis, multiCategories}', '<BarChart data={deptAnalysis}');

fs.writeFileSync('src/components/SkillMatrixDashboard.tsx', dash);
console.log("Fixed");
