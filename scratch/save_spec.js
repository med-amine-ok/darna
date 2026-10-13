const fs = require('fs');
const readline = require('readline');

async function extractDarnaSpec() {
  const fileStream = fs.createReadStream('C:\\Users\\OASIS\\.gemini\\antigravity-ide\\brain\\fe6c4f32-2c56-4f9a-abf1-0ee864543f0d\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('DARNA — Host Types, Approval Modes')) {
      const parsed = JSON.parse(line);
      const content = parsed.content;
      const idx = content.indexOf('# DARNA — Host Types, Approval Modes');
      const darnaText = content.substring(idx);
      
      fs.writeFileSync('c:\\Users\\OASIS\\Documents\\darna\\scratch\\darna_spec.md', darnaText);
      console.log('Successfully saved darna_spec.md, length:', darnaText.length);
      break;
    }
  }
}

extractDarnaSpec();
