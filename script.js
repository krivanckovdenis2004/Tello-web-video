const homeScreen = document.getElementById('homeScreen');
const callScreen = document.getElementById('callScreen');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomInput = document.getElementById('roomInput');
const leaveBtn = document.getElementById('leaveBtn');
const roomTitle = document.getElementById('roomTitle');
const roomLinkText = document.getElementById('roomLinkText');
const jitsiContainer = document.getElementById('jitsiContainer');

let api = null;

function makeRoomCode() {
  return `TELLO-${Math.floor(100000 + Math.random() * 900000)}`;
}

function cleanRoomName(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/\s+/g, '');
}

function openRoom(roomCode) {
  const roomName = cleanRoomName(roomCode || makeRoomCode());
  if (!roomName) {
    alert('Введите код комнаты');
    return;
  }

  const newUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomName)}`;
  window.history.replaceState({}, '', newUrl);

  homeScreen.hidden = true;
  callScreen.hidden = false;
  roomTitle.textContent = `Комната: ${roomName}`;
  roomLinkText.textContent = newUrl;

  if (api) {
    api.dispose();
  }

  api = new JitsiMeetExternalAPI('meet.jit.si', {
    roomName: `TelloVideo_${roomName}`,
    parentNode: jitsiContainer,
    width: '100%',
    height: '100%',
    configOverwrite: {
      prejoinPageEnabled: false,
      startWithAudioMuted: false,
      startWithVideoMuted: false
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      MOBILE_APP_PROMO: false
    }
  });
}

function leaveRoom() {
  if (api) {
    api.dispose();
    api = null;
  }
  jitsiContainer.innerHTML = '';
  callScreen.hidden = true;
  homeScreen.hidden = false;
  window.history.replaceState({}, '', window.location.pathname);
}

createRoomBtn.addEventListener('click', () => {
  openRoom(makeRoomCode());
});

joinRoomBtn.addEventListener('click', () => {
  openRoom(roomInput.value);
});

roomInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    openRoom(roomInput.value);
  }
});

leaveBtn.addEventListener('click', leaveRoom);

const params = new URLSearchParams(window.location.search);
const roomFromLink = params.get('room');
if (roomFromLink) {
  openRoom(roomFromLink);
}
