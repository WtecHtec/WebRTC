const express = require('express')
const cors = require('cors')
const socketIo = require('socket.io')
const { loggerInfo } = require('./logger')
const port = 3000
const app = express()
const MAX_COUNT = 2


app.use(express.static('./statics'))
app.use(cors());

//设置跨域访问
// app.all('*', function(req, res, next) {
// 	res.header("Access-Control-Allow-Credentials", "true");
// 	res.header("Access-Control-Allow-Origin", "http://localhost:3000/");
// 	res.header("Access-Control-Allow-Headers", "X-Requested-With");
// 	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
// 	res.header("X-Powered-By",' 3.2.1')
// 	res.header("Content-Type", "application/json;charset=utf-8");
// 	next();
// });

app.get('/', (_, res) => {
  res.send('Hello World!')
})

const httpServer = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


/**
 * socket.io 开启跨域
 * 
 */
const io = socketIo(httpServer, {
	cors: {
    origin: "http://127.0.0.1:5500",
		credentials: true,
    methods: ["GET", "POST"],
	}
});

// 连接
/**
 * socket.broadcast.emit("an event", { some: "data" }) 所有人都会收到, 除了自己
 * socket.emit("an event", { some: "data" }) 当前连接会收到信息
 */
io.sockets.on('connection', socket => {
  // 断开连接
  socket.on("disconnect", (reason) => {
    console.log('disconnect',  reason)
  });
  // 断开重试
  socket.on("disconnecting", (reason) => {
    console.log('disconnecting',  reason, socket.rooms, socket.id)
    // for (const room of socket.rooms) {
    //   if (room !== socket.id) {
    //     socket.to(room).emit("user has left", socket.id);
    //   }
    // }
  })

  // 接收信息
  socket.on('message', (room, data) => {
    // console.log('room:', room, 'data:', data)
    /**
     * 接收信息，并且把信息发给同一个房间（room）的其他人
     */
		socket.to(room).emit('message', room, data)
  })

  // 用户加入房间
  socket.on('join', (room, data) => {
    /**
     *  获取当前房间room的连接数
     *   io.sockets.adapter.rooms  获取当前连接房间总数
     * 
     */
    const myRooms = io.sockets.adapter.rooms.get(room);
    const users = myRooms ? myRooms.size : 0;
    // 房间未满
    if (users <= MAX_COUNT) {
      // 加入房间 room
      socket.join(room)
      if (users) {
        // 通知房间room其他人,有人加入房间
        socket.to(room).emit('otherjoin', room, socket.id);
      }
			socket.emit('joined', room, socket.id)
      
      socket.broadcast.emit('system', '系统信息')
    } else {
      // 房间已满,离开当前连接房间
      socket.leave(room)
      socket.emit('full', room, socket.id)
    }
  })
  // 用户离开房间
  socket.on('leave', room => {
    socket.leave(room)
    const myRooms = io.sockets.adapter.rooms.get(room);
    const users = myRooms ? myRooms.size : 0;
    if (users) {
      // 通知房间room其他人离开
      socket.to(room).emit('bye', room, socket.id);
    }
    // 通知用户服务器已处理
    socket.emit('leaved', room, socket.id)
  })

})
