const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  "const [brandCapacity, setBrandCapacity] = useState<{ name: string, value: number }[]>([]);",
  "const [brandCapacity, setBrandCapacity] = useState<{ name: string, value: number }[]>([]);\n  const [capacityView, setCapacityView] = useState<'brand' | 'department'>('brand');"
);

const oldLogic = `          const rboName = m[0] || 'Unknown';
          const department = m[1] || 'Unknown';
          const dailyCapacity = Number(m[10]) || 0; // Capacity 16 Hours Pcs
          
          numberOfMachine += 1;
          
          capacityByBrand[rboName] = (capacityByBrand[rboName] || 0) + dailyCapacity;
          capacityByDept[department] = (capacityByDept[department] || 0) + dailyCapacity;
          totalDailyCapacity += dailyCapacity;`;

const newLogic = `          const rboName = m[0] || 'Unknown';
          const department = m[1] || 'Unknown';
          const dailyCapacity = Number(m[10]) || 0; // Capacity 16 Hours Pcs
          const capacityCount = m[17] || 'Yes';
          
          numberOfMachine += 1;
          
          if (capacityCount !== 'No') {
            capacityByBrand[rboName] = (capacityByBrand[rboName] || 0) + dailyCapacity;
            capacityByDept[department] = (capacityByDept[department] || 0) + dailyCapacity;
            totalDailyCapacity += dailyCapacity;
          }`;

content = content.replace(oldLogic, newLogic);

const oldHeader = `<div className="flex justify-between items-center mb-4">
            <h3 className="uppercase text-sm tracking-wider font-semibold text-gray-500">Statistics (Brand Capacity)</h3>
            <div className="flex items-center text-sm text-[#F87C6C] font-medium">
              <span className="w-4 h-0.5 bg-[#F87C6C] mr-2"></span>
              CAPACITY
            </div>
          </div>`;

const newHeader = `<div className="flex justify-between items-center mb-4">
            <h3 className="uppercase text-sm tracking-wider font-semibold text-gray-500">
              Statistics ({capacityView === 'brand' ? 'Brand' : 'Department'} Capacity)
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-md p-1">
                <button 
                  onClick={() => setCapacityView('brand')}
                  className={\`px-3 py-1 text-xs font-semibold rounded-sm transition-colors \${capacityView === 'brand' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}\`}
                >
                  Brand
                </button>
                <button 
                  onClick={() => setCapacityView('department')}
                  className={\`px-3 py-1 text-xs font-semibold rounded-sm transition-colors \${capacityView === 'department' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}\`}
                >
                  Department
                </button>
              </div>
              <div className="flex items-center text-sm text-[#F87C6C] font-medium">
                <span className="w-4 h-0.5 bg-[#F87C6C] mr-2"></span>
                CAPACITY
              </div>
            </div>
          </div>`;

content = content.replace(oldHeader, newHeader);

const oldChart = `<BarChart data={brandCapacity} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>`;
const newChart = `<BarChart data={capacityView === 'brand' ? brandCapacity : departmentCapacity} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>`;

content = content.replace(oldChart, newChart);

// Handle when array is empty logic
const oldEmpty = `) : brandCapacity.length === 0 ? (`;
const newEmpty = `) : (capacityView === 'brand' ? brandCapacity : departmentCapacity).length === 0 ? (`;

content = content.replace(oldEmpty, newEmpty);

fs.writeFileSync('src/components/Dashboard.tsx', content);
