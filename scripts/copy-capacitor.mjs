// Copies Capacitor's JS runtime into www/ (the app has no bundler).
// Without it, window.Capacitor.registerPlugin is missing on the device and no
// native plugin (text-to-speech, microphone) can be reached.
import { copyFileSync } from "node:fs";
copyFileSync("node_modules/@capacitor/core/dist/capacitor.js", "www/capacitor.js");
console.log("Copied capacitor.js into www/");
