"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openrgb_sdk_1 = require("openrgb-sdk");
const util_1 = require("util");
const gradient_color_1 = __importDefault(require("gradient-color"));
const color_1 = __importDefault(require("color"));
let client = new openrgb_sdk_1.Client("RAM-Usage-Integration", 6742, "localhost");
// const colours: GradientColor[] = [{ color: "#18b218" }, /*{ color: "#18b218", frac: 0 },*/ { color: "#1818b2" }, /*{ color: "#1818b2", frac: 0 },*/ { color: "#b218b2" }, /*{ color: "#b218b2", frac: 0 },*/ { color: "#b26818" }, /*{ color: "#b26818", frac: 0 }, */{ color: "#ffffff" }, { color: "#ffffff" }];
const colours = [{ color: "#18b218" }, { color: "#18b218", frac: 0 }, { color: "#1818b2" }, { color: "#1818b2", frac: 0 }, { color: "#b218b2" }, { color: "#b218b2", frac: 0 }, { color: "#b26818" }, { color: "#b26818", frac: 0 }, { color: "#ffffff" }, { color: "#ffffff" }];
let tryConnect = async () => {
    try {
        await client.connect();
    }
    catch (e) {
        console.log("error connecting", e);
        setTimeout(tryConnect, 1500);
    }
};
tryConnect();
let devices = [];
client.on("connect", async () => {
    console.log("Connected");
    devices = await client.getAllControllerData();
    console.log(devices);
});
client.on("disconnect", async () => {
    console.log("Disconnected");
    setTimeout(tryConnect, 2500);
});
let parseRgb = (rgbStr) => {
    return openrgb_sdk_1.utils.hexColor(new color_1.default(rgbStr).hex());
};
let getMem = (0, util_1.promisify)(require("meminfo"));
let updateRam = async () => {
    let meminfo = await getMem();
    let memInfoFormatted = {
        total: parseInt(meminfo.MemTotal),
        used: ((((parseInt(meminfo.MemTotal) - parseInt(meminfo.MemFree)) - parseInt(meminfo.Buffers)) - parseInt(meminfo.Cached)) - parseInt(meminfo.SReclaimable)),
        free: parseInt(meminfo.MemFree),
        shared: parseInt(meminfo.Shmem),
        buffers: parseInt(meminfo.Buffers),
        cache: (parseInt(meminfo.Cached) - parseInt(meminfo.SReclaimable))
    };
    console.log(memInfoFormatted);
    devices.forEach((dev, devI) => {
        if (dev.type != 1)
            return;
        let gradientOfColours = structuredClone(colours);
        gradientOfColours[0].frac = (memInfoFormatted.used / memInfoFormatted.total);
        gradientOfColours[2].frac = (memInfoFormatted.buffers / memInfoFormatted.total);
        gradientOfColours[4].frac = (memInfoFormatted.shared / memInfoFormatted.total);
        gradientOfColours[6].frac = (memInfoFormatted.cache / memInfoFormatted.total);
        gradientOfColours[8].frac = 1 - gradientOfColours[0].frac - gradientOfColours[1].frac - gradientOfColours[2].frac - gradientOfColours[3].frac;
        console.log(gradientOfColours);
        let rawGradient = (0, gradient_color_1.default)(gradientOfColours, dev.leds.length * 2);
        console.log(rawGradient);
        let newGradient = [];
        for (let i = 0; i < dev.leds.length; i++) {
            newGradient[i] = parseRgb(rawGradient[i * 2]);
        }
        console.log(newGradient);
        client.updateLeds(devI, newGradient);
    });
};
setInterval(updateRam, 250);
