"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
class SocketService {
    constructor() {
        // Object to keep track of the number of users in each room
        this.roomData = { "global": 0 };
        console.log("Initializing socket service...");
        this._io = new socket_io_1.Server({
            cors: {
                allowedHeaders: ["*"],
                origin: "*"
            }
        });
    }
    // Function to initialize all the event listeners
    initListeners() {
        console.log("Initializing listeners...");
        const io = this._io;
        io.on("connect", (socket) => {
            // New connection -> connect to global room by default
            console.log("New connection -> connecting to global", socket.id);
            socket.join("global");
            socket.roomName = "global";
            this.roomData["global"] += 1;
            io.to("global").emit("event:count", this.roomData["global"]);
            console.log(this.roomData);
            // Event listener for incoming messages
            socket.on("event:message", (data) => {
                console.log("Message received", data);
                socket.broadcast.to([...socket.rooms]).emit("event:message", data);
            });
            // Event listener for joining a room
            socket.on("event:join", (room) => {
                this.handleJoinRoom(socket, room);
            });
            // Event listener for creating a room
            socket.on("event:create", (room) => {
                this.handleCreateRoom(socket, room);
            });
            // Event listener for disconnecting from a room
            socket.on("disconnect", () => {
                console.log("Disconnecting", socket.id);
                this.roomData[socket.roomName || "global"] -= 1;
                io.to(socket.roomName || "global").emit("event:count", this.roomData[socket.roomName || "global"]);
            });
        });
    }
    // Function to handle joining a room
    handleJoinRoom(socket, room) {
        room = room.toLowerCase();
        const io = this._io;
        if (!(room in this.roomData) || this.roomData[room] == 0) {
            io.to(socket.id).emit("event:error", "Room not found");
            return;
        }
        this.leaveRoom(socket);
        console.log("Join room", room);
        socket.join(room);
        socket.roomName = room;
        this.roomData[room] += 1;
        io.to(socket.id).emit("event:joined", room);
        io.to(room).emit("event:count", this.roomData[room] || 0);
    }
    // Function to handle creating a room
    handleCreateRoom(socket, room) {
        room = room.toLowerCase();
        const io = this._io;
        if (room in this.roomData && this.roomData[room] > 0) {
            io.to(socket.id).emit("event:error", "Room already exists");
            return;
        }
        this.leaveRoom(socket);
        this.roomData[room] = 0;
        socket.join(room);
        socket.roomName = room;
        this.roomData[room] += 1;
        io.to(socket.id).emit("event:created", room);
        io.to(room).emit("event:count", this.roomData[room] || 0);
    }
    // Function to handle leaving a room
    leaveRoom(socket) {
        const io = this._io;
        socket.leave(socket.roomName || "global");
        this.roomData[socket.roomName || "global"] -= 1;
        // inform previous room about new count
        io.to(socket.roomName || "global").emit("event:count", this.roomData[socket.roomName || "global"]);
    }
    get io() {
        return this._io;
    }
}
exports.default = SocketService;
