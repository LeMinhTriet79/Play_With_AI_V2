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
        private String status; // WAITING, PLAYING, FINISHED

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

    // In-memory room store. In production use a database or Redis.
    static final Map<String, RoomInfo> rooms = new ConcurrentHashMap<>();

    @GetMapping("/rooms")
    public Collection<RoomInfo> getRooms() {
        return rooms.values();
    }

    @GetMapping("/rooms/{roomId}")
    public RoomInfo getRoom(@PathVariable String roomId) {
        return rooms.get(roomId);
    }

    @PostMapping("/rooms")
    public RoomInfo createRoom(@RequestBody Map<String, String> payload) {
        String roomId = UUID.randomUUID().toString().substring(0, 6);
        String player = payload.get("player");
        String roomName = payload.getOrDefault("roomName", "Bàn của " + player);
        String side = payload.getOrDefault("side", "red");

        RoomInfo room = new RoomInfo(roomId, roomName, player, side);
        rooms.put(roomId, room);

        broadcastRoomUpdate();
        return room;
    }

    @PostMapping("/rooms/{roomId}/join")
    public RoomInfo joinRoom(@PathVariable String roomId, @RequestBody Map<String, String> payload) {
        RoomInfo room = rooms.get(roomId);
        if (room == null) {
            return null;
        }
        String player = payload.get("player");

        // Don't re-add if already in the room
        if (player.equals(room.getPlayerRed()) || player.equals(room.getPlayerBlack())) {
            return room;
        }

        if (room.getPlayerRed() == null) {
            room.setPlayerRed(player);
        } else if (room.getPlayerBlack() == null) {
            room.setPlayerBlack(player);
        } else {
            // Room is full
            return room;
        }

        if (room.getPlayerRed() != null && room.getPlayerBlack() != null) {
            room.setStatus("PLAYING");
        }

        broadcastRoomUpdate();
        // Also push room-state directly into the game topic so the waiting player (A) gets updated
        Map<String, Object> joinEvent = new java.util.HashMap<>();
        joinEvent.put("type", "ROOM_STATE");
        joinEvent.put("roomId", roomId);
        joinEvent.put("playerRed", room.getPlayerRed());
        joinEvent.put("playerBlack", room.getPlayerBlack());
        joinEvent.put("status", room.getStatus());
        messagingTemplate.convertAndSend("/topic/game/" + roomId, (Object) joinEvent);

        return room;
    }

    /**
     * Player leaves room. If the other player is still present,
     * keep the room alive with status WAITING. Only delete when both leave.
     */
    @DeleteMapping("/rooms/{roomId}")
    public void leaveRoom(@PathVariable String roomId, @RequestParam(required = false) String player) {
        RoomInfo room = rooms.get(roomId);
        if (room == null) return;

        if (player != null) {
            if (player.equals(room.getPlayerRed())) {
                room.setPlayerRed(null);
            } else if (player.equals(room.getPlayerBlack())) {
                room.setPlayerBlack(null);
            }
            room.setStatus("WAITING");

            // If no one is left, delete the room
            if (room.getPlayerRed() == null && room.getPlayerBlack() == null) {
                rooms.remove(roomId);
            }
        } else {
            // Legacy: player param missing → delete room
            rooms.remove(roomId);
        }

        broadcastRoomUpdate();
    }

    private void broadcastRoomUpdate() {
        Object updateMsg = Map.of("type", "ROOM_UPDATE");
        messagingTemplate.convertAndSend("/topic/public", updateMsg);
    }
}
