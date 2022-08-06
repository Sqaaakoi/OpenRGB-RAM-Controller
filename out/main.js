"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openrgb_sdk_1 = require("openrgb-sdk");
const util_1 = require("util");
const color_1 = __importDefault(require("color"));
let client = new openrgb_sdk_1.Client("RAM-Usage-Integration", 6742, "localhost");
const colours = [{ color: "#18b218" }, { color: "#18b218" }, /*{ color: "#18b218", frac: 0 },*/ { color: "#1818b2" }, /*{ color: "#1818b2", frac: 0 },*/ { color: "#b218b2" }, /*{ color: "#b218b2", frac: 0 },*/ { color: "#b26818" }, /*{ color: "#b26818", frac: 0 }, */ { color: "#ffffff" }];
// const colours: GradientColor[] = [{ color: "#18b218" }, { color: "#18b218", frac: 0 }, { color: "#1818b2" }, { color: "#1818b2", frac: 0 }, { color: "#b218b2" }, { color: "#b218b2", frac: 0 }, { color: "#b26818" }, { color: "#b26818", frac: 0 }, { color: "#ffffff" }, { color: "#ffffff" }];
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
        gradientOfColours[0].frac = 0;
        gradientOfColours[1].frac = memInfoFormatted.used;
        gradientOfColours[2].frac = gradientOfColours[1].frac + memInfoFormatted.buffers;
        gradientOfColours[3].frac = gradientOfColours[2].frac + memInfoFormatted.shared;
        gradientOfColours[4].frac = gradientOfColours[3].frac + memInfoFormatted.cache;
        gradientOfColours[5].frac = memInfoFormatted.total;
        let channels = convertArrays(gradientOfColours);
        let output = [];
        for (let i = 0; i < dev.leds.length; i++) {
            console.log(channels);
            console.log((memInfoFormatted.total / (dev.leds.length - 1)) * i);
            output[i] = getColorAt(channels, (memInfoFormatted.total / (dev.leds.length)) * i);
        }
        console.log(channels, output);
        client.updateLeds(devI, output);
    });
};
setInterval(updateRam, 250);
let convertArrays = (a) => {
    let channelArrays = {
        red: [],
        green: [],
        blue: []
    };
    a.forEach(e => {
        let colors = openrgb_sdk_1.utils.hexColor(e.color);
        console.log(colors, 'aaa');
        for (const channel in colors) {
            channelArrays[channel].push([e.frac, colors[channel]]);
        }
    });
    return channelArrays;
};
let getColorAt = (as, i) => {
    return {
        red: require('bilinear-interpolate')(as.red)(i),
        green: require('bilinear-interpolate')(as.green)(i),
        blue: require('bilinear-interpolate')(as.blue)(i)
    };
};
