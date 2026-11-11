const fs = require('fs');
const file = 'C:\\Users\\Asus\\OneDrive\\Desktop\\IT209\\Personal_Finance_Management_1Month\\frontend\\src\\pages\\Members.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('"Tìm người dùng"', '"Tìm người dùng"');
fs.writeFileSync(file, content, 'utf8');
console.log('Done');