document.addEventListener('DOMContentLoaded', function () {
    const emailList = document.getElementById('email-list');
    const ticketDetails = document.getElementById('ticket-details');

    // Fetch and display emails
    fetch('/emails')
        .then((response) => response.json())
        .then((emails) => {
            emails.forEach((email) => {
                const id = encodeURIComponent(email.id);
                const from = encodeURIComponent(email.from);
                const subject = encodeURIComponent(email.subject);

                const emailItem = document.createElement('div');
                emailItem.classList.add('card', 'mb-2');
                emailItem.innerHTML = `
          <div class="card-body">
            <h5 class="card-title">${email.subject}</h5>
            <p class="card-text">${email.snippet}</p>
            <button class="btn btn-primary" onclick="openTicket();">티켓 오픈</button>
          </div>
        `;
                emailList.appendChild(emailItem);
            });
        });

    // Function to open a ticket
    window.openTicket = function (id, from, subject) {
        ticketDetails.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${subject}</h5>
          <p class="card-text">From: ${from}</p>
          <textarea id="reply-text" class="form-control" rows="3" placeholder="Write your reply here..."></textarea>
          <button class="btn btn-success mt-2" onclick="sendReplyAll('${id}', '${from}', '${subject}')">Send Reply</button>
          <button class="btn btn-danger mt-2" onclick="closeTicket('${id}')">Close Ticket</button>
        </div>
      </div>
    `;
    };

    // Function to send a reply
    window.sendReply = function (to, subject) {
        const text = document.getElementById('reply-text').value;
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
        const text = document.getElementById('reply-text').value;
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
