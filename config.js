// ====== EDIT THIS TO MATCH YOUR SETUP ======
const CONFIG = {
  // This MUST match TOPIC_BASE in the ESP32 sketch, character-for-character.
  // Keep it unique & hard to guess (the HiveMQ public broker is shared by everyone).
  TOPIC_BASE: "athan/damoney-8f2a1c",

  // Public MQTT broker over secure WebSocket (works from GitHub Pages HTTPS).
  // EMQX public broker. ESP32 side uses broker.emqx.io : 1883 (plain TCP).
  BROKER_WSS: "wss://broker.emqx.io:8084/mqtt",

  // Used to display today's prayer schedule (must match the ESP32 settings).
  CITY: "Nashville",
  COUNTRY: "USA",
  METHOD: 2            // 2 = ISNA
};
