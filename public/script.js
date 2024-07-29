const socket = io('/');

const hostVideo = document.createElement('video');
hostVideo.muted = true;

let user = '';
while (!user) {
    user = prompt("Enter your name:");
}

var peer = new Peer({
    host: '127.0.0.1',
    port: '5000',
    path: '/peerjs',
    // secure: true
});

const peers = {};

// const videoGrid = document.getElementById('video-grid');
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        document.getElementById('video-grid').append(video);
    });
};

function connectToNewUser(userId, stream) {
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
};

let hostVideoStream;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    hostVideoStream = stream;
    addVideoStream(hostVideo, stream);

    peer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    socket.on('user-connected', (userId, userName) => {
        connectToNewUser(userId, stream);
        alert(`${userName} has joined the room.`);
    });

    socket.on('user-disconnected', (userId, userName) => {
        if (peers[userId]) peers[userId].close();
        alert(`${userName} has left the room.`);
    });

    socket.on('user-toggled-mic', (userId, userName, isEnabled) => {
        alert(`${userName} has ${isEnabled ? 'unmuted' : 'muted'} their mic.`);
    });

    socket.on('user-toggled-cam', (userId, userName, isEnabled) => {
        alert(`${userName} has ${isEnabled ? 'turned on' : 'turned off'} their camera.`);
    });

    socket.on('createMessage', (message, userName) => {
        const messageContainer = document.querySelector('.messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (userName === user) {
            messageElement.classList.add('self-message');
            sendSound.play();
        } else {
            messageElement.classList.add('others-message');
            receiveSound.play();
        }

        messageElement.innerHTML = `<b>${userName} :</b><span>${message}</span>`;
        messageContainer.append(messageElement);
        scrollToBottom();
        // messageContainer.scrollTop = messageContainer.scrollHeight;
    });
});

function scrollToBottom() {
    const chatWindow = document.querySelector('.main_chat_window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

peer.on('open', id => {
    console.log('Id' + id);
    socket.emit('join-room', ROOM_ID, id, user);
});

// giving functionality to buttons
const invite = document.querySelector("#inviteButton");
const mute = document.querySelector("#muteButton");
const noVideo = document.querySelector("#stopVideo");
const cutCall = document.querySelector("#disconnect");

mute.addEventListener("click", () => {
    const enabled = hostVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        hostVideoStream.getAudioTracks()[0].enabled = false;
        html = '<i class="material-icons">mic_off</i>';
    } else {
        hostVideoStream.getAudioTracks()[0].enabled = true;
        html = '<i class="material-icons">mic</i>';
    }
    mute.classList.toggle("background_red");
    mute.innerHTML = html;
    socket.emit('toggle-mic', ROOM_ID, peer.id, user, !enabled);
})

noVideo.addEventListener("click", () => {
    const enabled = hostVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        hostVideoStream.getVideoTracks()[0].enabled = false;
        html = '<i class="material-icons">videocam_off</i>';
    } else {
        hostVideoStream.getVideoTracks()[0].enabled = true;
        html = '<i class="material-icons">videocam</i>';
    }
    noVideo.classList.toggle("background_red");
    noVideo.innerHTML = html;
    socket.emit('toggle-cam', ROOM_ID, peer.id, user, !enabled);
})

invite.addEventListener("click", () => {
    prompt("Copy this link and share with your friends to add them on this VC Chat room now!",
        window.location.href
    );
})

cutCall.addEventListener("click", () => {
    try {
        peer.destroy();
        const videoCall = document.querySelector("video");
        if (videoCall) {
            videoCall.remove();
        }
        socket.emit("custom-disconnect");
        window.location.href = "/";
    } catch (error) {
        console.error("Error during disconnection:", error);
    }
});

// Chat functionality
const receiveSound = new Audio('/sounds/message-receive.mp3');
const sendSound = new Audio('/sounds/message-send.mp3');

const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('sendButton');

sendButton.addEventListener('click', () => {
    const message = chatInput.value;
    if (message.trim().length > 0) {
        socket.emit('message', message, user);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && chatInput.value) {
        socket.emit('message', chatInput.value, user);
        chatInput.value = '';
    }
});




