const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        if (char === '{') stack.push({line: i+1, col: j+1});
        else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Unexpected } at line ${i+1}, col ${j+1}`);
            } else {
                stack.pop();
            }
        }
    }
}
if (stack.length > 0) {
    stack.forEach(s => console.log(`Unclosed { at line ${s.line}, col ${s.col}`));
}
