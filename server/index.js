const express = require('express')
const port = 3000
const app = express()
// const cors = require('cors')
const socketIo = require('socket.io')
const MAX_COUNT = 2


app.use(express.static('./statics'))
// app.use(cors());

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


const io = socketIo(httpServer, {
	// allowEIO3: true,
	cors: {
    origin: "http://127.0.0.1:5500",
		credentials: true,
    methods: ["GET", "POST"],
	}
});

io.sockets.on('connection', socket => {
	console.log('新的连接')
})
