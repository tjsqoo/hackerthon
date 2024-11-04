const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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
        // console.log('Authorize this app by visiting this url:', authUrl);
        res.redirect(authUrl);
    }
    return oAuth2Client;
}
app.get('/oauth', async (req, res) => {
    authorize(res);
});

// Save the token after the user authorizes
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    console.log(code);
    const oAuth2Client = await authorize(res);

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    res.redirect('/');
});

// List Gmail messages
app.get('/emails', async (req, res) => {
    // const oAuth2Client = await authorize(res);
    // const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    //
    // const response = await gmail.users.messages.list({
    //     userId: 'me',
    //     maxResults: 10,
    // });
    //
    // const messages = await Promise.all(
    //     response.data.messages.map(async (message) => {
    //         const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
    //         console.log(msg);
    //         return {
    //             id: message.id,
    //             subject: msg.data.payload.headers.find((h) => h.name === 'Subject').value,
    //             from: msg.data.payload.headers.find((h) => h.name === 'From').value,
    //             snippet: msg.data.snippet,
    //             body: msg.data.payload.parts ? msg.data.payload.parts[0].body.data : '',
    //             date: msg.data.internalDate,
    //         };
    //     })
    // );
    //
    // res.json(messages);
    const oAuth2Client = await authorize(res);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
    });

    // 이메일을 스레드 단위로 그룹화할 객체
    const threads = {};

    const messages = await Promise.all(
        response.data.messages.map(async (message) => {
            const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });

            const threadId = msg.data.threadId;
            const emailData = {
                id: message.id,
                subject: msg.data.payload.headers.find((h) => h.name === 'Subject').value,
                from: msg.data.payload.headers.find((h) => h.name === 'From').value,
                snippet: msg.data.snippet,
                body: msg.data.payload.parts ? msg.data.payload.parts[0].body.data : '',
                date: msg.data.internalDate,
            };

            // 같은 threadId로 그룹화
            if (!threads[threadId]) {
                threads[threadId] = {
                    threadId,
                    messages: []
                };
            }

            threads[threadId].messages.push(emailData);
            // 오름차순 정렬 (과거 -> 최근)
            threads[threadId].messages.sort((a, b) => a.date - b.date);
            console.log(threads[threadId].messages);
            // threads[threadId].messages.reverse();
        })
    );

    // 클라이언트로 각 스레드를 배열 형태로 응답
    res.json(Object.values(threads));

});

// Send a reply to a ticket (email)
app.post('/send-reply', async (req, res) => {
    const { to, subject, text } = req.body;
    const oAuth2Client = await authorize();

    // app 비밀번호 생성
    // https://support.google.com/mail/answer/185833?hl=en&sjid=12270231918191650822-AP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // type: 'OAuth2',
            user: 'xdea123@flow.team', // Replace with your email
            pass: '@@@@@@@@@@@@@@',
            // clientId: oAuth2Client._clientId,
            // clientSecret: oAuth2Client._clientSecret,
            // refreshToken: oAuth2Client.credentials.refresh_token,
            // accessToken: oAuth2Client.credentials.access_token,
        },
    });

    const mailOptions = {
        from: 'xdea123@flow.team',
        to: to,
        subject: subject,
        text: text,
    };

    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({error: error.message});
        }
        res.json({message: 'Reply sent', info});
    });
});

app.post('/send-reply-all', async (req, res) => {
    const { id, to, cc, subject, text } = req.body;
    const oAuth2Client = await authorize();

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const originalEmailData = await gmail.users.messages.get({
        userId: 'me',  // 'me' refers to the authenticated user
        id: id, // The ID of the message you want to retrieve
    });

    // Extract recipients (to, cc, bcc) from the original email data
    const originalRecipientsTo = originalEmailData.data.payload.headers.find(h => h.name === 'To').value;
    const originalRecipientsCc = originalEmailData.data.payload.headers.find(h => h.name === 'Cc')?.value || '';
    const originalSender = originalEmailData.data.payload.headers.find(h => h.name === 'From').value;

    // In-Reply-To and References headers for proper threading
    const inReplyTo = originalEmailData.data.payload.headers.find(h => h.name === 'Message-ID').value;
    const references = originalEmailData.data.payload.headers.find(h => h.name === 'References')?.value || inReplyTo;

    // app 비밀번호 생성
    // https://support.google.com/mail/answer/185833?hl=en&sjid=12270231918191650822-AP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // type: 'OAuth2',
            user: 'tjsqoo@gmail.com', // Replace with your email
            pass: 'jbhfqgxlfdvxvxyq',
            // clientId: oAuth2Client._clientId,
            // clientSecret: oAuth2Client._clientSecret,
            // refreshToken: oAuth2Client.credentials.refresh_token,
            // accessToken: oAuth2Client.credentials.access_token,
        },
    });

    const mailOptions = {
        from: 'tjsqoo@gmail.com',
        to: originalRecipientsTo,       // Reply to original recipients
        cc: originalRecipientsCc,       // Include CC recipients if any
        replyTo: originalSender,        // Reply to the original sender
        subject: `Re: ${originalEmailData.data.payload.headers.find(h => h.name === 'Subject').value}`,  // Use original subject with "Re:"
        text: text,  // Your reply text here
        inReplyTo: inReplyTo,           // Reply to the original message ID
        references: references,         // Maintain message thread
    };

    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({error: error.message});
        }
        res.json({message: 'Reply sent', info});
    });
});

// Close a ticket (simple status change, handled in frontend)
app.post('/close-ticket', (req, res) => {
    const { ticketId } = req.body;
    // Here you would update your data to mark this ticket as closed
    res.json({ message: `Ticket with ID ${ticketId} has been closed.` });
});

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


