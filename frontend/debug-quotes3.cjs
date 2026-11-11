const fs = require('fs');
const file = 'C:\\Users\\Asus\\OneDrive\\Desktop\\IT209\\Personal_Finance_Management_1Month\\frontend\\src\\pages\\Members.jsx';
let content = fs.readFileSync(file, 'utf8');
// Find the text with "Nhập username"
const idx = content.indexOf('Nhập username');
if (idx !== -1) {
  console.log('Found at index:', idx);
  // Show surrounding characters
  for (let i = idx - 20; i < idx + 80; i++) {
    console.log(i, content[i], content.charCodeAt(i));
  }
} else {
  console.log('Not found');
}