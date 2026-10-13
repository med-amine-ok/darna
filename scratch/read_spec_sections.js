const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\OASIS\\Documents\\darna\\scratch\\darna_spec.md', 'utf8');

const s8 = content.indexOf('## 8.');
const s9 = content.indexOf('## 9.');
const s10 = content.indexOf('## 10.');

console.log('--- SECTION 8 ---');
console.log(content.substring(s8, s9));

console.log('--- SECTION 9 ---');
console.log(content.substring(s9, s10));

console.log('--- SECTION 10 ---');
console.log(content.substring(s10));
