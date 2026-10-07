package com.minhtriet.se3979.play_with_ai_backend.controller;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chess")
@CrossOrigin(origins = "*")
public class ChessRoomController {

    private final SimpMessagingTemplate messagingTemplate;

    public ChessRoomController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }


    public static class RoomInfo {
        private String roomId;
        private String roomName;
        private String playerRed;
        private String playerBlack;
        private String status; // WAITING, PLAYING

        public RoomInfo() {}

        public RoomInfo(String roomId, String roomName, String player, String side) {
            this.roomId = roomId;
            this.roomName = roomName;
            if ("red".equalsIgnoreCase(side)) {
                this.playerRed = player;
            } else {
                this.playerBlack = player;
            }
            this.status = "WAITING";
        }

        public String getRoomId() { return roomId; }
        public void setRoomId(String roomId) { this.roomId = roomId; }
        public String getRoomName() { return roomName; }
        public void setRoomName(String roomName) { this.roomName = roomName; }
        public String getPlayerRed() { return playerRed; }
        public void setPlayerRed(String playerRed) { this.playerRed = playerRed; }
        public String getPlayerBlack() { return playerBlack; }
        public void setPlayerBlack(String playerBlack) { this.playerBlack = playerBlack; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    private static final Map<String, RoomInfo> rooms = new ConcurrentHashMap<>();

    @GetMapping("/rooms")
    public Collection<RoomInfo> getRooms() {
        return rooms.values();
    }

    @PostMapping("/rooms")
    public RoomInfo createRoom(@RequestBody Map<String, String> payload) {
        String roomId = UUID.randomUUID().toString().substring(0, 6);
        String player = payload.get("player");
        String roomName = payload.getOrDefault("roomName", "Bàn của " + player);
        String side = payload.getOrDefault("side", "red");
        
        RoomInfo room = new RoomInfo(roomId, roomName, player, side);
        rooms.put(roomId, room);
        Object updateMsg = Map.of("type", "ROOM_UPDATE");
        messagingTemplate.convertAndSend("/topic/public", updateMsg);
        return room;
    }

    @PostMapping("/rooms/{roomId}/join")
    public RoomInfo joinRoom(@PathVariable String roomId, @RequestBody Map<String, String> payload) {
        RoomInfo room = rooms.get(roomId);
        if (room != null) {
            String player = payload.get("player");
            if (room.getPlayerRed() == null) {
                room.setPlayerRed(player);
            } else if (room.getPlayerBlack() == null) {
                room.setPlayerBlack(player);
            }
            if (room.getPlayerRed() != null && room.getPlayerBlack() != null) {
                room.setStatus("PLAYING");
            }
            Object updateMsg = Map.of("type", "ROOM_UPDATE");
            messagingTemplate.convertAndSend("/topic/public", updateMsg);
        }
        return room;
    }
    
    @DeleteMapping("/rooms/{roomId}")
    public void deleteRoom(@PathVariable String roomId) {
        rooms.remove(roomId);
        Object updateMsg = Map.of("type", "ROOM_UPDATE");
        messagingTemplate.convertAndSend("/topic/public", updateMsg);
    }
}
