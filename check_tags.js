const fs = require('fs');
const code = fs.readFileSync('apps/masterpanel/_pages/admin/AdminBranding.tsx', 'utf8');

// A simple regex approach to find all tags
const tags = [...code.matchAll(/<\/?([A-Za-z0-9_]+)[^>]*>/g)];

const stack = [];
for (const match of tags) {
  const fullTag = match[0];
  const tagName = match[1];

  // Skip self-closing tags
  if (fullTag.endsWith('/>')) continue;
  
  // Skip HTML/lowercase tags
  if (tagName[0] === tagName[0].toLowerCase()) continue;

  if (fullTag.startsWith('</')) {
    const last = stack.pop();
    if (!last || last.name !== tagName) {
      console.log(`Mismatch! Found </${tagName}> but expected </${last ? last.name : 'NONE'}> around:`, fullTag);
    }
  } else {
    stack.push({ name: tagName, tag: fullTag });
  }
}

if (stack.length > 0) {
  console.log('Unclosed tags:', stack.map(s => s.name));
} else {
  console.log('All custom component tags seem balanced!');
}
