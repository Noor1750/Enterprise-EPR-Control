const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Layout.tsx');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Replace card/panel wrappers
  content = content.replace(/bg-white\s+(?:p-\d+\s+)?rounded-(?:lg|xl)\s+shadow-sm\s+(?:mb-\d+\s+)?border\s+border-gray-(?:100|200)/g, 'bg-white border border-[#E6E9ED] p-4 mb-4 rounded-sm');
  content = content.replace(/bg-white\s+rounded-lg\s+shadow-sm\s+overflow-hidden\s+border\s+border-gray-200/g, 'bg-white border border-[#E6E9ED] overflow-hidden rounded-sm mb-4');
  
  // Headings
  content = content.replace(/text-2xl\s+font-bold\s+text-gray-900/g, 'text-xl font-medium text-[#73879C]');
  content = content.replace(/text-xl\s+font-bold\s+mb-4/g, 'text-lg font-medium text-[#73879C] border-b-2 border-[#E6E9ED] pb-2 mb-4');
  content = content.replace(/text-gray-900/g, 'text-[#73879C]');
  
  // Primary buttons (blue)
  content = content.replace(/bg-blue-600(.*?)hover:bg-blue-700/g, 'bg-[#337AB7]$1hover:bg-[#286090]');
  content = content.replace(/bg-blue-50 text-blue-600/g, 'bg-[#E6E9ED] text-[#73879C]');
  content = content.replace(/text-blue-600 hover:text-blue-800/g, 'text-[#337AB7] hover:text-[#286090]');

  // Success buttons (green)
  content = content.replace(/bg-green-600(.*?)hover:bg-green-700/g, 'bg-[#26B99A]$1hover:bg-[#169F85]');
  
  // Table headers
  content = content.replace(/bg-gray-50\s+text-left\s+text-xs\s+font-medium\s+text-gray-500\s+uppercase\s+tracking-wider/g, 'bg-[#F9F9F9] text-left text-[13px] font-semibold text-[#73879C] border-b-2 border-[#E6E9ED]');
  content = content.replace(/bg-gray-50/g, 'bg-[#F9F9F9]');

  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Updated styles.");
