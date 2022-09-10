
const localVideo = document.getElementById('localvideo')
const remoteVideo = document.getElementById('remotevideo')
const btnConn = document.getElementById('connserver')
const btnLeave = document.getElementById('leave')
const offer = document.getElementById('offer')
const answer = document.getElementById('answer')
const pcConfig = {
	iceServers: [
		{
			urls: 'turn:1.116.139.149:3478',
			username: 'herzshen',
			credential: 'qwer8748',
		}
	],
	iceTransportPolicy: 'relay',
	iceCandidatePoolSize: '0',
}

let localStream = null
let remoteStream = null
let pc = null
const roomId = 'A01';
let socket = null;
let offerdesc = null
let state = 'init'

function sendMessage(roomId, data) {
	if (socket) {
		socket.emit('message', roomId, data)
	}
}

function conn() {
	socket = io.connect('http://localhost:3000')
	// 加入房间成功
	socket.on('joined', (roomId, id) => {
		state = 'joined'
		console.log('joined', roomId, id)
		createPeerConnection();
		bindTracks();
		btnConn.disabled = true
		btnLeave.disabled = false;
		console.log('recevie', state)
	});

	socket.on('otherjoin', roomId => {
		if (state === 'joined_unbind') {
			createPeerConnection();
			bindTracks();
		}
		state = 'joined_conn'
		call()
	});

	socket.on('full',  (roomId,id) => {
		socket.disconnect()
		handup()
		closeLocalMedia()
		state = 'leaved'
	})

	socket.on('leaved', (roomId, id)=> {
		state = 'leaved'
		socket.disconnect()
		btnConn.disabled = false
		btnLeave.disabled = true;
	})

	socket.on('bye', (roomId, id)=> {
		state = 'joined_unbind'
		handup()
		offer.value = ''
		answer.value = ''
	})

	socket.on('disconnect', socket => {
		if ( state !== 'leaved') {
			handup()
			closeLocalMedia()
			state = 'leaved'
		}
	})

	socket.on('message', (roomId, data)=> {

		if (data === null || data === undefined) {
			return
		}

		if (data.hasOwnProperty('type') && data.type ==='offer' ) {
			offer.value = data.sdp;
			pc.setRemoteDescription(new RTCSessionDescription(data))
			pc.createAnswer()
			.then(getAnswer)
			.catch(handleAnswerError)
		} else if (data.hasOwnProperty('type') && data.type === 'answer') {
			answer.value = data.sdp;
			pc.setRemoteDescription(new RTCSessionDescription(data))
		} else if (data.hasOwnProperty('type') && data.type === 'candidate') {
			const candidate = new RTCIceCandidate({
				sdpMLineIndex:data.label,
				candidate: data.candidate
			})
			pc.addIceCandidate(candidate)
		} else {
			console.log('message', data)
		}
	});

	socket.emit('join', roomId)
	return true
}

function connSignalServer() {
	start()
	return true
}

function getMediaStream(stream) {
	if (localStream) {
		stream.getAudioTracks().forEach(track => {
			localStream.addTrack(track)
			stream.removeTrack(track)
		})
	} else {
		localStream = stream
	}
	localVideo.srcObject = localStream
	conn()
}

function handleError(error) {
	console.error(error)
}
function handleAnswerError(error) {
	console.error(error)
}

function start() {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		const constraints = {
			video: true,
			audio: {
				echoCancellation: true,
				noiseSupperssion: true,
				autoGainControl: true,
			}
		}
		navigator.mediaDevices.getUserMedia(constraints).then(getMediaStream).catch(handleError)
	}
}

function getRemoteStream(e) {
	remoteStream = e.streams[0]
	remoteVideo.srcObject = e.streams[0]
}

function handleOfferError(err) {
	console.error('handleOfferError', err)
}

function handleAnswerError() {
	console.error('handleAnswerError')
}
function getAnswer(desc) {
	pc.setLocalDescription(desc)
	answer.value = desc.sdp
	sendMessage(roomId, desc)
}

function getOffer(desc) {
	pc.setLocalDescription(desc)
	offer.value = desc.sdp
	offerdesc =desc
	sendMessage(roomId, offerdesc)
}

function createPeerConnection() {
	if (!pc) {
		pc = new RTCPeerConnection(pcConfig)
		pc.onicecandidate = (e)=> {
			if (e.candidate) {
				sendMessage(roomId, {
					type: 'candidate',
					label: e.candidate.sdpMid,
					candidate: e.candidate.candidate
				})
			} else {
				console.log('createPeerConnection errr', e)
			}
		}

		pc.ontrack = getRemoteStream
	} else {
		console.log('pc not creaed')
	}
	return
}

function bindTracks() {
	if (pc && localStream) {
		localStream.getTracks().forEach( track => {
			pc.addTrack(track, localStream)
		})
	}
}

function call() {
	if (state === 'joined_conn') {
		const offerOptions = {
			offerToReceiveAudio: 1,
			offerToReceiveVideo: 1
		}
		if (pc) {
			pc.createOffer(offerOptions).then(getOffer).catch(handleOfferError)
		}
		console.log('call ===', pc)
	
	}
}

function handup() {
	if (pc) {
		offerdesc = null
		pc.close()
		pc = null
	}
}

function closeLocalMedia() {
	if (localStream) {
		localStream.getTracks().forEach(track => {
			track.stop()
		})
		localStream = null
	}
}

function leave() {
	socket.emit('leave', roomId)
	handup()
	closeLocalMedia()
	offer.value = ''
	answer.value = ''
	btnConn.disabled = false
	btnLeave.disabled = true
}

btnConn.onclick = connSignalServer
btnLeave.onclick = leave