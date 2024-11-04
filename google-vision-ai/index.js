// @google-cloud/vision 라이브러리를 불러옴
const vision = require('@google-cloud/vision');
const pdf = require('pdf-poppler');

const express = require('express');
const { google } = require('googleapis');

const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// express config
const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// file uploader config
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/origin/'); // 업로드할 디렉터리
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일명 설정
    }
});
const upload = multer({ storage: storage });


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
        //console.log('Authorize this app by visiting this url:', authUrl);
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
app.get('/', async (req, res) => {
    // 실행: 이미지 파일 경로를 전달하여 OCR 수행
    const originFilePath = 'test.pdf'; // 이미지 파일 경로 설정
    let result = '';
    let isImage = false;
    if (isImage) {
        const htmlText = await detectText(originFilePath);
        // const htmlText = await documentTextDetection(originFilePath);
        console.log(JSON.stringify(htmlText));
        result = ocrToSvg(htmlText);
        // result = generateHtmlCss(htmlText);
    } else {
        // 1. PDF를 이미지로 변환
        const imagePaths = await convertPdfToImages(originFilePath);
        console.log(imagePaths);
        // 2. 각 이미지 파일에 대해 텍스트 분석 및 HTML 생성
        for (const imagePath of imagePaths) {
            const htmlText = await detectText(imagePath);
            const htmlCssResult = ocrToSvg(htmlText);
            // const htmlCssResult = generateHtmlCss(htmlText);
            result += htmlCssResult + "\n";
        }
    }

    res.send(result);
});

// 파일 업로드 엔드포인트
app.post('/upload', upload.single('file'), async (req, res) => {
    if (req.file) {
        const result = await convert(req.file.filename, req.file.path);
        res.json({message: '파일 업로드 성공!', file: req.file, convert: result});
    } else {
        res.status(400).json({message: '파일 업로드 실패'});
    }
});

async function convert(fileName, originFilePath) {

    let result;

    try {
        const fileType = getFileType(fileName);
        switch (fileType) {
            case 'image': {
                // text 추출
                const htmlText = await detectText(originFilePath);
                // svg 생성
                // let convertedResult = ocrToSvg(htmlText);
                let convertedResult = generateHtmlCss(htmlText);

                result = {
                    success: true,
                    desc: convertedResult
                };
            }
                break;
            case 'pdf': {
                const imagePaths = await convertPdfToImages(originFilePath);
                let convertedResult = '';
                for (const imagePath of imagePaths) {
                    // text 추출
                    const htmlText = await detectText(imagePath);
                    // svg 생성
                    // const htmlCssResult = ocrToSvg(htmlText);
                    const htmlCssResult = generateHtmlCss(htmlText);

                    convertedResult += htmlCssResult + "\n";
                }

                result = {
                    success: true,
                    desc: convertedResult,
                    path: imagePaths
                };
            }
                break;
            case 'etc': {
                result = {
                    success: false,
                    desc: 'This file type is not supported.'
                };
            }
                break;
            default: {
                result = {
                    success: false,
                    desc: 'This file type is not supported.'
                };
            }
        }
    } catch (e) {
        console.error(e);
    } finally {

    }
    return result;
}

// OCR을 이용해 문서에서 추출하는 함수
async function documentTextDetection(imagePath, res) {
    const visionClient = new vision.ImageAnnotatorClient({
        keyFilename: path.join(__dirname, 'credentials.json') // 서비스 계정 키 파일 경로
    });

    let ocrResult = 'good';
    try {
        // 이미지를 Vision API로 분석
        const [result] = await visionClient.documentTextDetection(imagePath);
        const textAnnotations = result.textAnnotations;
        const text = textAnnotations[0].description;
        console.log("Extracted Text:\n", text);

        // 각 텍스트 위치 정보를 기반으로 HTML로 변환
        let htmlContent = "<html><body><table style='border:1px solid black'>";

        for (let i = 1; i < textAnnotations.length; i++) {
            const annotation = textAnnotations[i];
            const vertices = annotation.boundingPoly.vertices;
            const cellText = annotation.description;

            // 각 셀의 위치에 맞춰 HTML 테이블의 셀을 구성
            htmlContent += `<tr><td style="border:1px solid black; position: absolute; top: ${vertices[0].y}px; left: ${vertices[0].x}px;">${cellText}</td></tr>`;
        }

        htmlContent += "</table></body></html>";

        // 결과 HTML 저장
        fs.writeFileSync('output.html', htmlContent);
        console.log("HTML output saved as output.html");
    } catch (err) {
        console.error('OCR 처리 중 오류 발생:', err);
    } finally {

    }

    return ocrResult;
}

// OCR을 이용해 이미지에서 텍스트를 추출하는 함수
async function detectText(imagePath) {
    // Google Cloud Vision API 클라이언트 생성
    // const oAuth2Client = await authorize(res);
    // console.log(oAuth2Client);
    const visionClient = new vision.ImageAnnotatorClient({
        keyFilename: path.join(__dirname, 'credentials.json') // 서비스 계정 키 파일 경로
    });
    //
    // const visionClient = new vision.ImageAnnotatorClient({
    //     auth: oAuth2Client
    // });

    let ocrResult;
    try {
        // 이미지를 Vision API로 분석
        const [result] = await visionClient.documentTextDetection(imagePath);
        // console.log(result);
        const detections = result.textAnnotations;

        // if (detections.length > 0) {
        //     console.log(detections); // 이미지에서 추출된 텍스트 출력
        // }

        // 첫 번째 항목은 전체 텍스트, 이후 항목들은 각 단어 정보
        ocrResult = detections.slice(1).map(annotation => ({
            text: annotation.description,
            bounds: annotation.boundingPoly.vertices,
        }));
    } catch (err) {
        console.error('OCR 처리 중 오류 발생:', err);
    } finally {

    }

    return ocrResult;
}

// PDF를 이미지로 변환하는 함수
async function convertPdfToImages(pdfPath) {
    let imagePaths;
    try {
        const outputDir = path.dirname(pdfPath);
        const options = {
            format: 'png',
            out_dir: outputDir,
            out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
            page: null, // 모든 페이지를 변환합니다.
        };

        await pdf.convert(pdfPath, options);
        imagePaths = fs.readdirSync(outputDir)
            .filter(file => file.startsWith(options.out_prefix) && file.endsWith('.png'))
            .map(file => path.join(outputDir, file));

    } catch(e) {
        console.error(e);
    }

    return imagePaths;
}


// HTML/CSS 생성 함수
function generateHtmlCss(textData) {
    let htmlContent = `<div style="position: relative; width: 100%; height: auto;">\n`;

    textData.forEach(({ text, bounds }) => {
        const [p1, , p3] = bounds;  // 좌상단(p1)과 우하단(p3) 좌표
        const width = p3.x - p1.x;
        const height = p3.y - p1.y;

        htmlContent += `
      <div style="
        position: absolute;
        top: ${p1.y}px;
        left: ${p1.x}px;
        width: ${width}px;
        height: ${height}px;
        font-size: ${Math.round(height * 0.8)}px;
        overflow: hidden;
        white-space: nowrap;
      ">
        ${text}
      </div>\n`;
    });

    htmlContent += `</div>`;
    return htmlContent;
}

// OCR 데이터를 SVG로 변환하는 Node.js 함수
function ocrToSvg(ocrData, svgWidth = '100%', svgHeight = '100%') {
    // SVG 초기화
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">\n`;

    // OCR 데이터를 순회하여 각 텍스트를 SVG로 변환
    ocrData.forEach(item => {
        const { text, bounds } = item;
        if (bounds && bounds.length >= 2) {
            // 좌표 계산 (왼쪽 상단과 오른쪽 하단 좌표를 사용)
            const x = bounds[0].x;
            const y = bounds[0].y;

            // SVG <text> 요소 생성
            svg += `  <text x="${x}" y="${y}" font-size="16" font-family="Arial">${text}</text>\n`;
        }
    });

    // SVG 종료 태그
    svg += `</svg>`;

    return svg;
}

// OpenAI API 호출 함수
async function getHtmlFromText(text) {
    const prompt = `
  Convert the following text into HTML tags:
  ${text}
  `;

    const response = await openai.createCompletion({
        model: 'text-davinci-003',  // 원하는 모델을 선택하세요.
        prompt: prompt,
        max_tokens: 500,
    });

    return response.data.choices[0].text.trim();
}

// 메인 함수
async function processImage(imagePath) {
    try {
        // 1. 이미지에서 텍스트 추출
        const extractedText = await extractTextFromImage(imagePath);
        console.log("Extracted Text:", extractedText);

        // 2. OpenAI에 HTML 형식 요청
        const htmlResult = await getHtmlFromText(extractedText);
        console.log("HTML Result:", htmlResult);

    } catch (error) {
        console.error("Error processing image:", error);
    }
}

// 파일 유형을 구분하는 함수
function getFileType(filename) {
    // 확장자를 소문자로 변환해서 가져옴
    const ext = path.extname(filename).toLowerCase();

    // 파일 유형별 확장자 목록
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const pdfExtension = '.pdf';

    if (imageExtensions.includes(ext)) {
        return 'image';
    } else if (ext === pdfExtension) {
        return 'pdf';
    } else {
        return 'etc';
    }
}

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

