const fs = require('fs');
const file = 'C:\\Users\\Asus\\OneDrive\\Desktop\\IT209\\Personal_Finance_Management_1Month\\frontend\\src\\pages\\Members.jsx';
let content = fs.readFileSync(file, 'utf8');
// Find the line with "Tìm người dùng"
const idx = content.indexOf('Tìm người dùng');
if (idx !== -1) {
  console.log('Found at index:', idx);
  // Show surrounding characters - wider range
  for (let i = idx - 20; i < idx + 60; i++) {
    console.log(i, content[i], content.charCodeAt(i));
  }
} else {
  console.log('Not found');
}