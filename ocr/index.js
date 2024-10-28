const Tesseract = require('tesseract.js');

// Tesseract.recognize(
//     'test.png',
//     'eng', // 언어 설정 (예: 영어)
//     {
//         logger: info => console.log(info) // 진행 상황 로깅
//     }
// ).then(({ data: { text } }) => {
//     console.log(text);
// });