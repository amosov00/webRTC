//require our websocket library
const WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090
const wss = new WebSocketServer({port: 9090});
const fs =  require('fs')

//all connected to the server users
let users = {};
let data;
let conn
let i = 0
function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}

//when a user connects to our sever
wss.on('connection', (connection) => {
    console.log("user connected");

    //when server gets a message from a connected user
    connection.on('message', (message) => {

        //accepting only JSON messages
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {}
        }

        //switching type of the user message
        switch (data.type) {
            //when a user tries to login
            case "login":
                console.log("User logged:", data.name);

                //if anyone is logged in with this username then refuse
                if(users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    //save user connection on the server
                    users[data.name] = connection;
                    connection.na = data.name;

                    sendTo(connection, {
                        type: "login",
                        success: true,
                    });
                }

                break;
            case "offer":
                //for ex. UserA wants to call UserB
                console.log("Sending offer to: ", data.name);

                //if UserB exists then send him offer details
                conn = users[data.name];

                if(conn != null) {
                    //setting that UserA connected with UserB
                    connection.otherName = data.name;

                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.na
                    });

                }

                break;
            case "answer":
                console.log("Sending answer to: ", data.name);

                //for ex. UserB answers UserA
                conn = users[data.name];

                if(conn != null) {
                    connection.otherName = data.name;

                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }

                break;
            case "candidate":
                console.log("Sending candidate to:",data.name);
                conn = users[data.name];

                if(conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    })
                    i++
                    fs.writeFileSync(`TO ${data.name} ${i}.txt`, JSON.stringify(data.candidate))
                }

                break;
            case "leave":
                console.log("Disconnecting from", data.name);
                conn = users[data.name];
                conn.otherName = null;

                //notify the other user so he can disconnect his peer connection
                if(conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }

                break;

            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });

                break;
        }
    });

    connection.send("Hello from server");
    connection.on("close", function() {

        if(connection.na) {
            delete users[connection.na];

            if(connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                conn = users[connection.otherName];
                conn.otherName = null;

                if(conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }

            }
        }
    });
});
