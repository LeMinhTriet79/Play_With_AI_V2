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
        String player = payload.get("player");
        for (RoomInfo r : rooms.values()) {
            if (player.equals(r.getPlayerRed()) || player.equals(r.getPlayerBlack())) {
                throw new IllegalArgumentException("Bạn đang ở trong bàn #" + r.getRoomId() + ". Vui lòng rời bàn đó trước!");
            }
        }
        String roomId = UUID.randomUUID().toString().substring(0, 6);
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

        // Don't re-add if already in THIS room
        if (player.equals(room.getPlayerRed()) || player.equals(room.getPlayerBlack())) {
            return room;
        }
        
        // Prevent joining if already in ANOTHER room
        for (RoomInfo r : rooms.values()) {
            if (player.equals(r.getPlayerRed()) || player.equals(r.getPlayerBlack())) {
                throw new IllegalArgumentException("Bạn đang ở trong bàn #" + r.getRoomId() + ". Vui lòng rời bàn đó trước!");
            }
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
        // Push a JOIN event directly into the game room topic so player A's
        // screen updates immediately (works for BOTH old and new frontend code).
        String joinerSide = player.equals(room.getPlayerRed()) ? "red" : "black";
        Map<String, Object> joinEvent = new java.util.HashMap<>();
        joinEvent.put("type", "JOIN");
        joinEvent.put("roomId", roomId);
        joinEvent.put("sender", player);       // required by old frontend handler
        joinEvent.put("player", player);
        joinEvent.put("side", joinerSide);    // required by old frontend handler
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

    public void handleUserDisconnect(String player) {
        if (player == null || player.isBlank()) return;
        boolean changed = false;
        
        for (RoomInfo room : rooms.values()) {
            boolean isRed = player.equals(room.getPlayerRed());
            boolean isBlack = player.equals(room.getPlayerBlack());
            
            if (isRed || isBlack) {
                if (isRed) {
                    room.setPlayerRed(null);
                }
                if (isBlack) {
                    room.setPlayerBlack(null);
                }
                room.setStatus("WAITING");
                
                if (room.getPlayerRed() == null && room.getPlayerBlack() == null) {
                    rooms.remove(room.getRoomId());
                } else {
                    // Notify the remaining player
                    Map<String, Object> leaveEvent = new java.util.HashMap<>();
                    leaveEvent.put("type", "LEAVE");
                    leaveEvent.put("roomId", room.getRoomId());
                    leaveEvent.put("sender", player);
                    leaveEvent.put("player", player);
                    leaveEvent.put("side", isRed ? "red" : "black");
                    messagingTemplate.convertAndSend("/topic/game/" + room.getRoomId(), (Object) leaveEvent);
                }
                changed = true;
            }
        }
        if (changed) {
            broadcastRoomUpdate();
        }
    }

    private void broadcastRoomUpdate() {
        Object updateMsg = Map.of("type", "ROOM_UPDATE");
        messagingTemplate.convertAndSend("/topic/public", updateMsg);
    }
}
