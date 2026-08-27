const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('src/components');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // replace "if (!window.confirm(...))" and "if (!confirm(...))" with "if (false)"
  code = code.replace(/if\s*\(\s*!window\.confirm\([^)]+\)\s*\)/g, 'if (false)');
  code = code.replace(/if\s*\(\s*!confirm\([^)]+\)\s*\)/g, 'if (false)');
  
  // replace "if (window.confirm(...))" and "if (confirm(...))" with "if (true)"
  code = code.replace(/if\s*\(\s*window\.confirm\([^)]+\)\s*\)/g, 'if (true)');
  code = code.replace(/if\s*\(\s*confirm\([^)]+\)\s*\)/g, 'if (true)');
  
  // replace "const confirm = window.confirm(...)"
  code = code.replace(/const confirm = window\.confirm\([^)]+\);/g, 'const confirm = true;');
  fs.writeFileSync(file, code);
}
