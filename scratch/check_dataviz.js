const fs = require('fs');
const path = 'C:\\Users\\OASIS\\Documents\\skills\\dataviz\\SKILL.md';
if (fs.existsSync(path)) {
  console.log('dataviz SKILL.md found!');
  const content = fs.readFileSync(path, 'utf8');
  console.log(content.substring(0, 1500));
} else {
  console.log('dataviz SKILL.md not found at', path);
}
