const home = document.getElementById('home');
const room = document.getElementById('room');
const roomCodeEl = document.getElementById('roomCode');
const roomInput = document.getElementById('roomInput');
const toast = document.getElementById('toast');

let currentRoom = '';

function normalizeRoom(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return '';
  return clean.startsWith('TELLO-') ? clean : `TELLO-${clean}`;
}

function generateRoom() {
  return `TELLO-${Math.floor(100000 + Math.random() * 900000)}`;
}

function inviteLink() {
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(currentRoom)}`;
}

function jitsiLink() {
  // Открываем Jitsi напрямую, а не внутри сайта. На iPhone так соединение стабильнее.
  const safeName = `TelloVideo_${currentRoom.replace(/[^A-Z0-9-]/g, '')}`;
  return `https://meet.jit.si/${safeName}`;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 1900);
}

function openRoom(code) {
  currentRoom = normalizeRoom(code);
  if (!currentRoom) return;
  roomCodeEl.textContent = currentRoom;
  home.classList.add('hidden');
  room.classList.remove('hidden');
  history.replaceState(null, '', `?room=${encodeURIComponent(currentRoom)}`);
}

async function copyInvite() {
  const link = inviteLink();
  try {
    await navigator.clipboard.writeText(link);
    showToast('Ссылка скопирована');
  } catch (e) {
    prompt('Скопируй ссылку:', link);
  }
}

document.getElementById('createBtn').addEventListener('click', () => openRoom(generateRoom()));
document.getElementById('joinByCodeBtn').addEventListener('click', () => {
  const code = normalizeRoom(roomInput.value);
  if (!code) return showToast('Введите код комнаты');
  openRoom(code);
});
document.getElementById('backBtn').addEventListener('click', () => {
  currentRoom = '';
  room.classList.add('hidden');
  home.classList.remove('hidden');
  history.replaceState(null, '', location.pathname);
});
document.getElementById('copyBtn').addEventListener('click', copyInvite);
document.getElementById('shareBtn').addEventListener('click', async () => {
  const link = inviteLink();
  if (navigator.share) {
    try { await navigator.share({ title: 'Tello Video', text: 'Зайди в мой видеозвонок Tello', url: link }); }
    catch (e) {}
  } else {
    await copyInvite();
  }
});
document.getElementById('openCallBtn').addEventListener('click', () => {
  window.location.href = jitsiLink();
});

const params = new URLSearchParams(location.search);
const roomParam = params.get('room');
if (roomParam) openRoom(roomParam);
