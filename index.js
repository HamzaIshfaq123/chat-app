const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require("path");
const io = new Server(server);

// 1) Set the view engine to ejs
app.set("view engine", "ejs");

// 2) Set the views folder path (if not already in default)
app.set("views", path.join(__dirname, "views"));


app.get("/" , (req , res) => {
    return res.render("index");
})

const users = {}; // socket.id → nickname
const typing_users = {}

io.on('connection', (socket) => {
  socket.on("set-nickname", (nickname) => {

    if (!nickname || nickname.trim() === "") {
      return; // ignore empty nicknames
    }

    socket.nickname = nickname;
    users[socket.id] = nickname; // save user
    io.emit("message", `${nickname} has joined the chat`);

    // send updated user list
    io.emit("users", Object.values(users));
  });
  socket.on("user-message" , message => {
    if (!message || message.trim() === "") {
    return; // ignore empty messages
  }else{
      io.emit("message", `${socket.nickname}: ${message}`)
    }
    // console.log("A new message has been sent", message)
    // send to all (Excluding the sender)
    // socket.broadcast.emit("message", message)
    // send to all (Including the sender)
  })
   // NEW: typing events
  socket.on("typing", () => {
    if (socket.nickname) { // only if nickname is set
    typing_users[socket.id] = socket.nickname; //saving names inside the object
    const names = Object.values(typing_users);
    let typingMessage = "";
    if (names.length > 0) {
        typingMessage = names.join(", ") + (names.length > 1 ? " are typing..." : " is typing...");
      }

      io.emit("typing", typingMessage); // update everyone
    }
  }
  );

  socket.on("stop-typing", () => {
    delete typing_users[socket.id]  //remove users from typing list
    const names = Object.values(typing_users);
    let typingMessage = "";
    if (names.length > 0) {
      typingMessage = names.join(", ") + (names.length > 1 ? " are typing..." : " is typing...");
    }

    io.emit("typing", typingMessage); // send updated list
    
  });

  socket.on("disconnect", () => {
    if (socket.nickname) {
      io.emit("message", `${socket.nickname} has left the chat`);
      delete users[socket.id];
      delete typing_users[socket.id]
      const names = Object.values(typing_users);
      let typingMessage = "";
      io.emit("users", Object.values(users));
      if (names.length > 0) {
      typingMessage = names.join(", ") + (names.length > 1 ? " are typing..." : " is typing...");
    }


    io.emit("typing", typingMessage); //send updated list of who is typing after someone disconnects
  }
  delete typing_users[socket.id];
  });
  
});



server.listen(8000, () => {
  console.log('listening on *:8000');
});