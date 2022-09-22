
const localVideo = document.getElementById('localvideo')
const remoteVideo = document.getElementById('remotevideo')
const btnConn = document.getElementById('connserver')
const btnLeave = document.getElementById('leave')
const offer = document.getElementById('offer')
const answer = document.getElementById('answer')

/**
 * turn服务器， NAT穿透
 *  RTCPeerConnection 配置
 */
const pcConfig = {
	iceServers: [
		{
			urls: 'turn:1.16.39.49:3478',
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

/***
 * 连接 socket.io 发送信息、视频数据
 */
function conn() {

	socket = io.connect('http://localhost:3000')
	// 加入房间成功
	socket.on('joined', (roomId, id) => {
		state = 'joined'
		console.log('joined', roomId, id)
    // 初始化webrtc
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

/**
 * 连接socket.io 服务，并将渲染本地多媒体
 * @param {*} stream 
 */
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

/**
 * 连接本地多媒体设备，并且连接
 */
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

/**
 * 获取远程 track 数据，并视频渲染
 * @param {*} e 
 */
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
/**
 * 创建 RTCPeerConnection 
 * 获取sdp数据，并且发送socket.Io
 */
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
/**
 * RTCPeerConnection 对象添加 Track 数据
 */
function bindTracks() {
	if (pc && localStream) {
		localStream.getTracks().forEach( track => {
			pc.addTrack(track, localStream)
		})
	}
}
/** 
 * 当已连接状态， 拨打webrtc
*/
function call() {
	if (state === 'joined_conn') {
		const offerOptions = {
			offerToReceiveAudio: 1,
			offerToReceiveVideo: 1
		}
		if (pc) {
      // 创建 RTCPeerConnection Offer，并且发送 sdp 数据到远程
			pc.createOffer(offerOptions).then(getOffer).catch(handleOfferError)
		}
		console.log('call ===', pc)
	
	}
}

/**
 *  关闭 RTCPeerConnection 连接
 */
function handup() {
	if (pc) {
		offerdesc = null
		pc.close()
		pc = null
	}
}

/**
 * 关闭本地媒体信息
 */
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