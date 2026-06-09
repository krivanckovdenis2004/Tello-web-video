import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyABjUot_f2sW5quw2JimDE3TyCHwctUR58",
  authDomain: "mvp-tello.firebaseapp.com",
  projectId: "mvp-tello",
  storageBucket: "mvp-tello.firebasestorage.app",
  messagingSenderId: "325295301590",
  appId: "1:325295301590:web:cf7609188b61d4dfaa7a77",
  measurementId: "G-P5YG3TPHM4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const home = document.getElementById('home');
const call = document.getElementById('call');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const roomTitle = document.getElementById('roomTitle');
const statusEl = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const waitBox = document.getElementById('waitBox');
const copyBtn = document.getElementById('copyBtn');
const micBtn = document.getElementById('micBtn');
const camBtn = document.getElementById('camBtn');
const flipBtn = document.getElementById('flipBtn');
const hangupBtn = document.getElementById('hangupBtn');

let pc, localStream, remoteStream, roomId, facingMode = 'user';
let unsubRoom, unsubOfferCandidates, unsubAnswerCandidates;

const servers = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10,
};

function makeRoomId(){ return 'TELLO-' + Math.floor(100000 + Math.random()*900000); }
function cleanRoom(input){ return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g,''); }
function roomLink(id){ return `${location.origin}${location.pathname}?room=${encodeURIComponent(id)}`; }
function showCall(id){ home.classList.add('hidden'); call.classList.remove('hidden'); roomTitle.textContent = id; statusEl.textContent = 'Разреши камеру и микрофон'; }
function setStatus(text){ statusEl.textContent = text; }

async function setupMedia(){
  localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
  remoteStream = new MediaStream();
  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  pc = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  pc.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    waitBox.style.display = 'none';
    setStatus('Друг подключился');
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') { waitBox.style.display = 'none'; setStatus('Звонок идёт'); }
    if (['failed','disconnected'].includes(pc.connectionState)) setStatus('Соединение прервалось. Попробуйте новую комнату.');
  };
}

async function createRoom(){
  roomId = makeRoomId();
  showCall(roomId);
  await setupMedia();

  const roomRef = doc(db, 'webrtcRooms', roomId);
  const offerCandidates = collection(roomRef, 'offerCandidates');
  const answerCandidates = collection(roomRef, 'answerCandidates');

  pc.onicecandidate = e => e.candidate && addDoc(offerCandidates, e.candidate.toJSON());
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp }, createdAt: Date.now() });

  setStatus('Ждём друга');
  try { await navigator.clipboard.writeText(roomLink(roomId)); } catch(e) {}

  unsubRoom = onSnapshot(roomRef, async snap => {
    const data = snap.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      setStatus('Соединяем...');
    }
  });

  unsubAnswerCandidates = onSnapshot(answerCandidates, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });
}

async function joinRoom(id){
  roomId = cleanRoom(id);
  if (!roomId) return alert('Введите код комнаты');
  showCall(roomId);
  await setupMedia();

  const roomRef = doc(db, 'webrtcRooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) { alert('Комната не найдена. Проверь код.'); location.href = location.pathname; return; }

  const offerCandidates = collection(roomRef, 'offerCandidates');
  const answerCandidates = collection(roomRef, 'answerCandidates');

  pc.onicecandidate = e => e.candidate && addDoc(answerCandidates, e.candidate.toJSON());
  await pc.setRemoteDescription(new RTCSessionDescription(roomSnap.data().offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp }, joinedAt: Date.now() });

  setStatus('Соединяем...');
  unsubOfferCandidates = onSnapshot(offerCandidates, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });
}

createBtn.onclick = createRoom;
joinBtn.onclick = () => joinRoom(roomInput.value);
copyBtn.onclick = async () => { await navigator.clipboard.writeText(roomLink(roomId)); alert('Ссылка скопирована'); };
hangupBtn.onclick = () => location.href = location.pathname;
micBtn.onclick = () => { const t = localStream?.getAudioTracks()[0]; if(t){ t.enabled = !t.enabled; micBtn.textContent = t.enabled ? 'Микрофон' : 'Микр. выкл'; } };
camBtn.onclick = () => { const t = localStream?.getVideoTracks()[0]; if(t){ t.enabled = !t.enabled; camBtn.textContent = t.enabled ? 'Камера' : 'Кам. выкл'; } };
flipBtn.onclick = async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  if (!localStream || !pc) return;
  const oldTrack = localStream.getVideoTracks()[0];
  oldTrack?.stop();
  const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
  const newTrack = newStream.getVideoTracks()[0];
  localStream.removeTrack(oldTrack);
  localStream.addTrack(newTrack);
  localVideo.srcObject = localStream;
  const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
  sender && sender.replaceTrack(newTrack);
};

const params = new URLSearchParams(location.search);
const paramRoom = params.get('room');
if (paramRoom) {
  roomInput.value = cleanRoom(paramRoom);
  joinRoom(roomInput.value);
}
