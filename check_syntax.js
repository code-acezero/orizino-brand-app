const fs = require('fs');
const babel = require('@babel/parser');

const code = fs.readFileSync('apps/masterpanel/_pages/admin/AdminBranding.tsx', 'utf8');
try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found by Babel!");
} catch (e) {
  console.error("Syntax Error at line " + e.loc.line + ", col " + e.loc.column);
  console.error(e.message);
}
