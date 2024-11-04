// google-auth-btn 버튼 클릭 시 /oauth URL로 이동
document.getElementById("google-auth-btn").addEventListener("click", function() {
    window.location.href = "/oauth";
});

document.addEventListener('DOMContentLoaded', function () {
    const emailList = document.getElementById('email-list');
    const ticketDetails = document.getElementById('ticket-details');

    // Fetch and display threads
    fetch('/emails')
        .then((response) => response.json())
        .then((threads) => {
            threads.forEach((thread) => {
                const threadItem = document.createElement('div');
                threadItem.classList.add('card', 'mb-3');

                // Create a container for the entire thread
                let threadContent = `
                    <div class="card-header">
                        <h5>${thread.messages[0].subject}</h5>
                    </div>
                    <div class="card-body">
                `;

                let mailInfo;
                // Add each email in the thread to the thread container
                thread.messages.forEach((email) => {
                    const id = encodeURIComponent(email.id);
                    const from = encodeURIComponent(email.from);
                    const subject = encodeURIComponent(email.subject);
                    mailInfo = {
                        id: id,
                        from: from,
                        subject: subject
                    }

                    threadContent += `
                        <div class="email-item mb-2">
<!--                            <h6 class="card-title">${email.subject}</h6>-->
<!--                            <p class="card-text">From: ${decodeURIComponent(from)}</p>-->
                            <p class="card-text">${email.snippet}</p>
<!--                            <button class="btn btn-primary btn-sm" onclick="openTicket('${id}', '${from}', '${subject}', this);">티켓 오픈</button>-->
                        </div>
                    `;
                });

                // Close the thread container and add it to the main list
                threadContent += `</div>`;
                threadContent += `<div>
                    <button class="btn btn-primary btn-sm" onclick="openTicket('${mailInfo.id}', '${mailInfo.from}', '${mailInfo.subject}', this);">답장 하기</button>
                </div>`;
                threadItem.innerHTML = threadContent;
                emailList.appendChild(threadItem);
            });
        });
    // Function to open a ticket below the email item as a thread
    window.openTicket = function (id, from, subject, buttonElement) {
        // Check if ticket is already open, remove if present
        const existingTicket = buttonElement.parentElement.querySelector('.ticket-thread');
        if (existingTicket) {
            existingTicket.remove();
            return;
        }

        // Create ticket thread container
        const ticketThread = document.createElement('div');
        ticketThread.classList.add('ticket-thread', 'mt-3');
        ticketThread.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">${decodeURIComponent(subject)}</h5>
                <p class="card-text">From: ${decodeURIComponent(from)}</p>
                
                <!-- 수신인(보낼 사람)을 입력할 수 있는 필드 추가 -->
                <p class="card-text">Cc: <input type="email" id="recipient-email-${id}" class="form-control mb-2" placeholder="티켓 오픈하며 담당자 배정"></p>
                
                <textarea id="reply-text-${id}" class="form-control" rows="3" placeholder="Write your reply here..."></textarea>
                <button class="btn btn-success mt-2" onclick="sendReplyAll('${id}', '${from}', '${subject}')">Send Reply</button>
                <button class="btn btn-danger mt-2" onclick="closeTicket('${id}', this)">Close Ticket</button>
            </div>
        </div>
    `;

        // Append ticket thread below the email item
        buttonElement.parentElement.appendChild(ticketThread);
    };

    // Function to send a reply
    window.sendReply = function (to, subject) {
        const text = document.getElementById(`reply-text-${id}`).value;
        fetch('/send-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: to, subject: subject, text: text }),
        })
            .then((response) => response.json())
            .then((data) => {
                alert('Reply sent!');
            });
    };

    window.sendReplyAll = function (id, to, subject) {
        const text = document.getElementById(`reply-text-${id}`).value;
        fetch('/send-reply-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id, to: to, subject: subject, text: text }),
        })
            .then((response) => response.json())
            .then((data) => {
                alert('ReplyAll sent!');
            });
    };

    // Function to close a ticket
    window.closeTicket = function (ticketId) {
        fetch('/close-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ticketId: ticketId }),
        })
            .then((response) => response.json())
            .then((data) => {
                alert(data.message);
            });
    };
});
