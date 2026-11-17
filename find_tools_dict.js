
const fs = require('fs');
const content = fs.readFileSync('it_tools_index.js', 'utf8');

// Find the object containing tools translations
// Look for pattern "tools:{"
const toolsIdx = content.indexOf('tools:{');
console.log('toolsIdx:', toolsIdx);
if (toolsIdx !== -1) {
    console.log(content.slice(toolsIdx, toolsIdx + 1000));
}
