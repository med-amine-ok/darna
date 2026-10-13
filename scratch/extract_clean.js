const fs = require('fs');
const readline = require('readline');

async function extractUserRequest() {
  const fileStream = fs.createReadStream('C:\\Users\\OASIS\\.gemini\\antigravity-ide\\brain\\fe6c4f32-2c56-4f9a-abf1-0ee864543f0d\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"USER_INPUT"') && line.includes('DARNA — Host Types, Approval Modes')) {
      const parsed = JSON.parse(line);
      const content = parsed.content;
      const startTag = '<USER_REQUEST>';
      const endTag = '</USER_REQUEST>';
      const sIdx = content.indexOf(startTag);
      const eIdx = content.indexOf(endTag);
      if (sIdx !== -1 && eIdx !== -1) {
        const userPrompt = content.substring(sIdx + startTag.length, eIdx).trim();
        fs.writeFileSync('c:\\Users\\OASIS\\Documents\\darna\\scratch\\clean_user_spec.md', userPrompt);
        console.log('Saved clean_user_spec.md, length:', userPrompt.length);
      }
      break;
    }
  }
}

extractUserRequest();
