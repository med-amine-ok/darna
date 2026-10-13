const fs = require('fs');
const readline = require('readline');

async function extractSections() {
  const fileStream = fs.createReadStream('C:\\Users\\OASIS\\.gemini\\antigravity-ide\\brain\\fe6c4f32-2c56-4f9a-abf1-0ee864543f0d\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"USER_INPUT"') && line.includes('DARNA — Host Types')) {
      const parsed = JSON.parse(line);
      const content = parsed.content;
      
      const sections = {};
      const regex = /##\s*([0-9]+)\.?\s*([^\n]+)/g;
      let matches = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({ num: match[1], title: match[2], idx: match.index });
      }
      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        const nextIdx = (i + 1 < matches.length) ? matches[i + 1].idx : content.length;
        const text = content.substring(cur.idx, nextIdx);
        sections[cur.num] = { title: cur.title, text };
      }
      
      console.log('Available sections:', Object.keys(sections));
      
      console.log('=== SECTION 8 ===');
      console.log(sections['8'] ? sections['8'].text : 'No section 8');
      
      console.log('=== SECTION 9 ===');
      console.log(sections['9'] ? sections['9'].text : 'No section 9');
      
      console.log('=== SECTION 10 ===');
      console.log(sections['10'] ? sections['10'].text : 'No section 10');
      
      break;
    }
  }
}

extractSections();
