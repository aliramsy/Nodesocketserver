const websocket = require("ws")
const jwt = require('jsonwebtoken')


function heartbeat() {
    this.isAlive = true;
  }
const ws = new websocket("wss://ws.kraken.com")
const wss = new websocket.WebSocketServer({port:8080})


//sending data to a remote socket
ws.on('open', function open() {
    const data = {"event":"subscribe","pair":["XBT/USD","XBT/EUR","ADA/USD"],"subscription":{"name":"ticker"}}
    newdata = JSON.stringify(data)
    ws.send(newdata)
})

//recieving data from a remote socket and running server and finally broadcasting to client sockets
ws.on('message', function message(data) {
    stringdata = data.toString()
    //console.log(stringdata)
    //run server
    wss.on("connection",function connect(socket){
        console.log("new connection")
        socket.isAlive = true
        socket.on('pong', heartbeat)
        socket.on("message",(msg)=>{
            //close the client if it doesnt send token after 5 seconds
            if (msg.length <25){
                setTimeout(()=>{
                    console.log("token is required!")
                    wss.clients.forEach((ws)=>{
                        return ws.terminate()
                    })
                    
            },5000)
            }else{
                //token verification process
                const jsondata = msg.toString()
                const parseddata = JSON.parse(jsondata)
                const token = parseddata.headers.token
                const allowedtoken = jwt.verify(token, 'secret-key')
                const name = allowedtoken.name
                if (name != "abcd"){
                    wss.clients.forEach(function each(client){
                        if (client !== ws && client.readyState === websocket.OPEN) {
                            const error = {"error":"unauthorized"}
                            const errordata = JSON.stringify(error)
                            client.send(errordata)
                        
                        }
                    })
                //sending data if everything is ok 
                }else{
                    wss.clients.forEach(function each(client){
                        if (client !== ws && client.readyState === websocket.OPEN) {
                            client.send(data)
                        }
                }) 
            }
            }                   
    }) 
      
})  
    //to check if a client socket is accidently closed
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false){
                return ws.terminate()
            } 
            ws.isAlive = false;
            ws.ping()
        })
    }, 20000)
    wss.on('close', function close() {
        clearInterval(interval)
      })
})
