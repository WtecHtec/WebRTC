// 获取设备信息 
navigator.mediaDevices.enumerateDevices().then(res => {
  console.log('获取设备信息成功：', res)
}).catch(err => {
  console.log('获取设备信息失败：', err)
})

const rtcDom = document.getElementById('webRtc');

// 处理输入设备字节流
const constraints = { audio: true, video: true };
navigator.mediaDevices.getUserMedia(constraints)
.then((stream) => {
  /* 使用这个 stream stream */
  console.log(stream)
  rtcDom.srcObject = stream
})
.catch((err) => {
  /* 处理 error */
  console.log(err)
});

