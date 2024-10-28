// @google-cloud/vision 라이브러리를 불러옴
const vision = require('@google-cloud/vision');
const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// Function to authorize the Gmail API client
async function authorize(res) {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        res.redirect(authUrl);
    }
    return oAuth2Client;
}

// Save the token after the user authorizes
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    const oAuth2Client = await authorize(res);

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    res.send('Authorization complete, you can close this window.');
});

// Route for the home page
app.get('/', (req, res) => {
    // 실행: 이미지 파일 경로를 전달하여 OCR 수행
    // const imagePath = 'test.png'; // 이미지 파일 경로 설정
    // detectText(imagePath, res);
    // res.json({message: 'ocr ok'});

    res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Node.js에서 Tesseract.js 사용하기</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
        }
        code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.9em;
          overflow-x: auto;
        }
        h2 {
          border-bottom: 2px solid #ddd;
          padding-bottom: 5px;
        }
        .code-copy {
          text-align: right;
          font-size: 0.8em;
          color: #007bff;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h2>Node.js에서 <code>tesseract.js</code> 사용 예시</h2>
      <p>네, Node.js 환경에서도 Tesseract와 같은 OCR 기능을 사용할 수 있는 여러 모듈이 존재합니다. 가장 대표적인 것이 <strong>tesseract.js</strong>입니다. 이는 브라우저와 Node.js에서 모두 사용할 수 있는 Tesseract의 JavaScript 포팅 버전입니다.</p>

      <h3><code>tesseract.js</code>의 주요 특징:</h3>
      <ul>
        <li><strong>오픈 소스:</strong> 무료로 사용할 수 있으며, Node.js뿐만 아니라 브라우저에서도 사용 가능.</li>
        <li><strong>다국어 지원:</strong> Tesseract 엔진을 기반으로 하여 여러 언어의 텍스트를 인식 가능.</li>
        <li><strong>워커 기반:</strong> 여러 코어를 사용하여 병렬로 작업을 수행할 수 있어 속도를 개선.</li>
      </ul>

      <h3>1. 설치:</h3>
      <pre><code>npm install tesseract.js</code></pre>

      <h3>2. 기본 사용법:</h3>
      <pre><code>const Tesseract = require('tesseract.js');
Tesseract.recognize(
  'path_to_image.jpg',
  'eng', // 언어 설정 (예: 영어)
  {
    logger: info => console.log(info) // 진행 상황 로깅
  }
).then(({ data: { text } }) => {
  console.log(text);
});
</code></pre>

      <div class="code-copy">코드 복사</div>

      <h2>추가적인 Node.js OCR 모듈</h2>
      <h3>1. <code>node-tesseract-ocr</code>:</h3>
      <ul>
        <li><code>tesseract.js</code>와 유사하지만, <strong>Tesseract의 CLI(명령줄 인터페이스)</strong>를 Node.js 환경에서 호출하는 방식으로 동작합니다.</li>
        <li>Tesseract 엔진을 시스템에 설치해야 하며, 이를 통해 높은 정확도의 OCR 처리가 가능합니다.</li>
      </ul>
    </body>
    </html>
  `);
});

// OCR을 이용해 이미지에서 텍스트를 추출하는 함수
async function detectText(imagePath, res) {
    // Google Cloud Vision API 클라이언트 생성
    const oAuth2Client = await authorize(res);
    console.log(oAuth2Client);
    const visionClient = new vision.ImageAnnotatorClient({
        keyFilename: path.join(__dirname, 'organic-lacing-439206-q9-2fe3f14763d5.json') // 서비스 계정 키 파일 경로
    });
    //
    // const visionClient = new vision.ImageAnnotatorClient({
    //     auth: oAuth2Client
    // });

    let ocrResult;
    try {
        // 이미지를 Vision API로 분석
        const [result] = await visionClient.textDetection(imagePath);
        const detections = result.textAnnotations;

        if (detections.length > 0) {
            console.log('텍스트 감지됨:');
            console.log(detections[0].description); // 이미지에서 추출된 텍스트 출력
            ocrResult = detections[0].description;
        } else {
            console.log('텍스트가 감지되지 않았습니다.');
            ocrResult('텍스트가 감지되지 않았습니다.');
        }
    } catch (err) {
        console.error('OCR 처리 중 오류 발생:', err);
    } finally {
        res.send(ocrResult);
    }
}

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

