const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'Layout.tsx');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // Table headers
  content = content.replace(/text-xs font-medium text-gray-500 uppercase(?: tracking-wider)?/g, 'text-[13px] font-semibold text-[#73879C]');
  
  // Replace inputs rounded-md with rounded-sm
  content = content.replace(/rounded-md/g, 'rounded-sm');
  
  // Replace text-gray-500 and text-gray-700
  content = content.replace(/text-gray-700/g, 'text-[#73879C]');
  content = content.replace(/text-gray-500/g, 'text-[#73879C]');
  content = content.replace(/text-gray-900/g, 'text-[#73879C]');
  
  // Replace border-gray-200 with border-[#E6E9ED]
  content = content.replace(/border-gray-200/g, 'border-[#E6E9ED]');
  content = content.replace(/border-gray-100/g, 'border-[#E6E9ED]');
  
  // Loader color
  content = content.replace(/text-blue-600/g, 'text-[#337AB7]');

  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Updated styles 2.");
