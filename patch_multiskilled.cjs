const fs = require('fs');

let dash = fs.readFileSync('src/components/SkillMatrixDashboard.tsx', 'utf8');

const multiCode = `
    const multiCategories = [
      { name: '1 Machine', count: 0 },
      { name: '2 Machines', count: 0 },
      { name: '3 Machines', count: 0 },
      { name: '4+ Machines', count: 0 }
    ];
    multiSkilled.forEach(count => {
      if (count === 1) multiCategories[0].count++;
      else if (count === 2) multiCategories[1].count++;
      else if (count === 3) multiCategories[2].count++;
      else if (count >= 4) multiCategories[3].count++;
    });
`;

dash = dash.replace("let mCount = 0;\n    multiSkilled.forEach(v => { if (v > 1) mCount++; });", "let mCount = 0;\n    multiSkilled.forEach(v => { if (v > 1) mCount++; });\n" + multiCode);

dash = dash.replace("levelDistribution: lvlDist,", "levelDistribution: lvlDist,\n      multiCategories,");

// Add chart
const chartCode = `
          {/* Multi-Skilled Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Multi-Skilled Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={multiCategories} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" name="Employees" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
`;

dash = dash.replace("{/* Critical Machines Section */}", chartCode + "\n        {/* Critical Machines Section */}");

// Wait, the grid was grid-cols-1 lg:grid-cols-3. If I add another col-span-1, it becomes 4 columns. 
// Level Dist (1) + Dept Cov (2) = 3. So the grid is full.
// I should wrap the new chart in a new grid or just change the first grid.
dash = dash.replace('<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">', '<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">');
dash = dash.replace('lg:col-span-2', 'lg:col-span-2');

fs.writeFileSync('src/components/SkillMatrixDashboard.tsx', dash);
console.log("Multi-skilled chart added");
