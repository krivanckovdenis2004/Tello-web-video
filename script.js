const servers = [
  { id: 'ffmuc', domain: 'meet.ffmuc.net', label: 'сервер 1' },
  { id: 'jitsi', domain: 'meet.jit.si', label: 'сервер 2' }
];

const homeScreen = document.getElementById('homeScreen');
const callScreen = document.getElementById('callScreen');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomInput = document.getElementById('roomInput');
const leaveBtn = document.getElementById('leaveBtn');
const roomTitle = document.getElementById('roomTitle');
const statusText = document.getElementById('statusText');
const jitsiContainer = document.getElementById('jitsiContainer');
const shareBox = document.getElementById('shareBox');
const createdRoomCode = document.getElementById('createdRoomCode');
const createdRoomLink = document.getElementById('createdRoomLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const copyLinkBtn2 = document.getElementById('copyLinkBtn2');
const shareLinkBtn = document.getElementById('shareLinkBtn');
const startCallBtn = document.getElementById('startCallBtn');
const helperBox = document.getElementById('helperBox');
const toast = document.getElementById('toast');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const serverBtn = document.getElementById('serverBtn');

let api = null;
let currentRoom = '';
let currentServerIndex = 0;
let scriptDomain = null;
let audioMuted = false;
let videoMuted = false;

function makeRoomCode() {
  return `TELLO-${Math.floor(100000 + Math.random() * 900000)}`;
}

function cleanRoomName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/\s+/g, '');
}

function roomLink(roomCode = currentRoom) {
  return `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}&server=${servers[currentServerIndex].id}`;
}

function showToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 1600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Ссылка скопирована');
  } catch (e) {
    prompt('Скопируй ссылку:', text);
  }
}

async function shareRoom() {
  const link = roomLink();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Tello Video', text: `Зайди в видеозвонок ${currentRoom}`, url: link });
      return;
    } catch (e) {}
  }
  copyText(link);
}

function prepareRoom(roomCode) {
  currentRoom = cleanRoomName(roomCode || makeRoomCode());
  if (!currentRoom) {
    alert('Введите код комнаты');
    return;
  }
  createdRoomCode.textContent = currentRoom;
  createdRoomLink.textContent = roomLink();
  shareBox.hidden = false;
  copyText(roomLink());
}

function loadJitsiScript(domain) {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI && scriptDomain === domain) return resolve();
    const old = document.getElementById('jitsiApiScript');
    if (old) old.remove();
    delete window.JitsiMeetExternalAPI;
    const s = document.createElement('script');
    s.id = 'jitsiApiScript';
    s.src = `https://${domain}/external_api.js`;
    s.onload = () => { scriptDomain = domain; resolve(); };
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

async function startCall(roomCode) {
  currentRoom = cleanRoomName(roomCode || currentRoom || makeRoomCode());
  if (!currentRoom) return;

  const link = roomLink();
  window.history.replaceState({}, '', link);
  homeScreen.hidden = true;
  callScreen.hidden = false;
  roomTitle.textContent = currentRoom;
  statusText.textContent = `Подключение · ${servers[currentServerIndex].label}`;
  helperBox.hidden = false;

  if (api) api.dispose();
  jitsiContainer.innerHTML = '';

  const domain = servers[currentServerIndex].domain;
  try {
    await loadJitsiScript(domain);
    api = new JitsiMeetExternalAPI(domain, {
      roomName: `TelloVideo_${currentRoom}`,
      parentNode: jitsiContainer,
      width: '100%',
      height: '100%',
      userInfo: { displayName: 'Tello User' },
      configOverwrite: {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        p2p: { enabled: true },
        resolution: 720,
        constraints: { video: { height: { ideal: 720, max: 720 } } }
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        MOBILE_APP_PROMO: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Друг',
        DEFAULT_LOCAL_DISPLAY_NAME: 'Вы',
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'settings', 'tileview']
      }
    });

    api.addEventListener('videoConferenceJoined', () => {
      statusText.textContent = 'Вы в звонке. Ждём друга...';
      setTimeout(() => { helperBox.hidden = true; }, 5000);
    });

    api.addEventListener('participantJoined', () => {
      statusText.textContent = 'Друг подключился';
      helperBox.hidden = true;
      showToast('Друг подключился');
    });

    api.addEventListener('participantLeft', () => {
      statusText.textContent = 'Друг вышел';
    });

    api.addEventListener('readyToClose', leaveRoom);
  } catch (e) {
    statusText.textContent = 'Ошибка подключения';
    alert('Сервер видеозвонка не открылся. Нажмите «Если не подключается» и попробуйте другой сервер.');
  }
}

function leaveRoom() {
  if (api) {
    api.dispose();
    api = null;
  }
  jitsiContainer.innerHTML = '';
  callScreen.hidden = true;
  homeScreen.hidden = false;
  helperBox.hidden = true;
  window.history.replaceState({}, '', window.location.pathname);
}

createRoomBtn.addEventListener('click', () => prepareRoom(makeRoomCode()));
joinRoomBtn.addEventListener('click', () => startCall(roomInput.value));
startCallBtn.addEventListener('click', () => startCall(currentRoom));
copyLinkBtn.addEventListener('click', () => copyText(roomLink()));
copyLinkBtn2.addEventListener('click', () => copyText(roomLink()));
shareLinkBtn.addEventListener('click', shareRoom);
leaveBtn.addEventListener('click', leaveRoom);

roomInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') startCall(roomInput.value);
});

muteBtn.addEventListener('click', () => {
  if (!api) return;
  api.executeCommand('toggleAudio');
  audioMuted = !audioMuted;
  muteBtn.textContent = audioMuted ? 'Включить звук' : 'Микрофон';
});

videoBtn.addEventListener('click', () => {
  if (!api) return;
  api.executeCommand('toggleVideo');
  videoMuted = !videoMuted;
  videoBtn.textContent = videoMuted ? 'Включить камеру' : 'Камера';
});

switchCameraBtn.addEventListener('click', () => {
  if (!api) return;
  try {
    api.executeCommand('toggleCamera');
    showToast('Пробуем сменить камеру');
  } catch (e) {
    alert('Если камера не меняется: нажмите шестерёнку ⚙️ внутри звонка → Камера. На iPhone Safari иногда не даёт переключить камеру кнопкой сайта.');
  }
});

serverBtn.addEventListener('click', () => {
  currentServerIndex = (currentServerIndex + 1) % servers.length;
  showToast(`Пробуем ${servers[currentServerIndex].label}`);
  startCall(currentRoom);
});

const params = new URLSearchParams(window.location.search);
const roomFromLink = params.get('room');
const serverFromLink = params.get('server');
const serverIndex = servers.findIndex(s => s.id === serverFromLink);
if (serverIndex >= 0) currentServerIndex = serverIndex;
if (roomFromLink) {
  currentRoom = cleanRoomName(roomFromLink);
  createdRoomCode.textContent = currentRoom;
  createdRoomLink.textContent = roomLink();
  shareBox.hidden = false;
  startCall(currentRoom);
}
