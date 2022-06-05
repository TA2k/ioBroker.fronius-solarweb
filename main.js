"use strict";

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const axios = require("axios");
const Json2iob = require("./lib/json2iob");

class FroniusSolarweb extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "fronius-solarweb",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.deviceArray = [];
        this.isPro = true;
        this.json2iob = new Json2iob(this);
        this.baseHeader = {
            "Content-Type": "application/json-patch+json",
            AccessKeyId: "FKIAFFB3D0986CF24CBDBF580755A9F38769",
            AccessKeyValue: "ab5563fb-ff0a-43d0-a526-c07a4d0b03aa",
            Accept: "application/json",
            "Accept-Language": "de-de",
        };
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Reset the connection indicator during startup
        this.setState("info.connection", false, true);
        if (this.config.interval < 0.5) {
            this.log.info("Set interval to minimum 0.5");
            this.config.interval = 0.5;
        }
        if (!this.config.username || !this.config.password) {
            this.log.error("Please set username and password in the instance settings");
            return;
        }
        this.requestClient = axios.create();

        this.updateInterval = null;
        this.reLoginTimeout = null;
        this.refreshTokenTimeout = null;
        this.session = {};
        this.subscribeStates("*");

        await this.login();

        if (this.session.jwtToken) {
            await this.getDeviceList();
            await this.updateDevices();
            this.updateInterval = setInterval(async () => {
                await this.updateDevices();
            }, this.config.interval * 60 * 1000);
            this.refreshTokenInterval = setInterval(() => {
                this.refreshToken();
            }, 3500 * 1000);
        }
    }
    async login() {
        delete this.baseHeader["Authorization"];
        await this.requestClient({
            method: "post",
            url: "https://swqapi.solarweb.com/iam/jwt",
            headers: this.baseHeader,
            data: JSON.stringify({
                userId: this.config.username,
                password: this.config.password,
            }),
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.session = res.data;
                this.baseHeader["Authorization"] = "Bearer " + this.session.jwtToken;
                this.setState("info.connection", true, true);
            })
            .catch((error) => {
                this.log.error(error);
                if (error.response) {
                    this.log.error(JSON.stringify(error.response.data));
                }
            });
    }
    async getDeviceList() {
        await this.requestClient({
            method: "get",
            url: "https://swqapi.solarweb.com/pvsystems?offset=0&limit=1000",
            headers: this.baseHeader,
        })
            .then(async (res) => {
                this.log.debug(JSON.stringify(res.data));
                for (const device of res.data.pvSystems) {
                    const id = device.pvSystemId;
                    this.deviceArray.push(id);

                    await this.setObjectNotExistsAsync(id, {
                        type: "device",
                        common: {
                            name: device.name,
                        },
                        native: {},
                    });
                    await this.setObjectNotExistsAsync(id + ".remote", {
                        type: "channel",
                        common: {
                            name: "Remote Controls",
                        },
                        native: {},
                    });
                    await this.setObjectNotExistsAsync(id + ".general", {
                        type: "channel",
                        common: {
                            name: "General Information",
                        },
                        native: {},
                    });

                    const remoteArray = [{ command: "Refresh", name: "True = Refresh" }];
                    remoteArray.forEach((remote) => {
                        this.setObjectNotExists(id + ".remote." + remote.command, {
                            type: "state",
                            common: {
                                name: remote.name || "",
                                type: remote.type || "boolean",
                                role: remote.role || "boolean",
                                write: true,
                                read: true,
                            },
                            native: {},
                        });
                    });
                    this.json2iob.parse(id + ".general", device);

                    await this.requestClient({
                        method: "get",
                        url: "https://swqapi.solarweb.com/pvsystems/" + id + "/devices",
                        headers: this.baseHeader,
                    })
                        .then(async (res) => {
                            this.log.debug(JSON.stringify(res.data));
                            await this.setObjectNotExistsAsync(id + ".devices", {
                                type: "channel",
                                common: {
                                    name: "Devices",
                                },
                                native: {},
                            });
                            for (const device of res.data.devices) {
                                await this.setObjectNotExistsAsync(id + ".devices." + device.deviceId, {
                                    type: "device",
                                    common: {
                                        name: device.deviceName,
                                    },
                                    native: {},
                                });

                                this.json2iob.parse(id + ".devices." + device.deviceId, device);
                            }
                        })
                        .catch((error) => {
                            this.log.error(error);
                            error.response && this.log.error(JSON.stringify(error.response.data));
                        });
                }
            })
            .catch((error) => {
                this.log.error(error);
                error.response && this.log.error(JSON.stringify(error.response.data));
            });
    }

    async updateDevices() {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const day = new Date().getDate();
        const toDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        const statusArray = [
            {
                path: "flowdata",
                url: "https://swqapi.solarweb.com/pvsystems/$id/flowdata",
                desc: "Flowdata",
            },
            {
                path: "histdata",
                url: "https://swqapi.solarweb.com/pvsystems/$id/histdata?from=" + toDate.getTime() + "&to=" + Date.now(),
                desc: "Historical Data",
                forceIndex: true,
            },
            {
                path: "weather",
                url: "https://swqapi.solarweb.com/pvsystems/$id/weather/current",
                desc: "Weather",
            },

            {
                path: "total",
                url: "https://swqapi.solarweb.com/pvsystems/$id/aggdata",
                desc: "AggData Total",
            },
            {
                path: "year",
                url: "https://swqapi.solarweb.com/pvsystems/$id/aggdata/years/" + year,
                desc: "AggData Year",
            },
            {
                path: "month",
                url: "https://swqapi.solarweb.com/pvsystems/$id/aggdata/years/" + year + "/months/" + month,
                desc: "AggData Month",
            },
            {
                path: "day",
                url: "https://swqapi.solarweb.com/pvsystems/$id/aggdata/years/" + year + "/months/" + month + "/days/" + day,
                desc: "AggData day",
            },
        ];
        if (this.isPro) {
            statusArray.push({
                path: "energyforecast",
                url: "https://swqapi.solarweb.com/pvsystems/$id/weather/energyforecast?from=" + toDate.getTime() + "&to=" + Date.now(),
                desc: "Energy Forecast",
                forceIndex: true,
            });
        }

        for (const id of this.deviceArray) {
            for (const element of statusArray) {
                const url = element.url.replace("$id", id);

                await this.requestClient({
                    method: "get",
                    url: url,
                    headers: this.baseHeader,
                })
                    .then((res) => {
                        this.log.debug(JSON.stringify(res.data));
                        if (!res.data) {
                            return;
                        }
                        const data = res.data.data;

                        const forceIndex = element.forceIndex;
                        const preferedArrayName = "channelName";

                        this.json2iob.parse(id + "." + element.path, data, { forceIndex: forceIndex, preferedArrayName: preferedArrayName, channelName: element.desc });
                    })
                    .catch((error) => {
                        if (error.response) {
                            if (error.response.status === 403) {
                                this.isPro = false;
                                this.log.info("Disable Pro Endpoints");

                                error.response && this.log.info(JSON.stringify(error.response.data));
                                return;
                            }
                            if (error.response.status === 401) {
                                error.response && this.log.debug(JSON.stringify(error.response.data));
                                this.log.info(element.path + " receive 401 error. Refresh Token in 60 seconds");
                                if (!this.refreshTokenTimeout) {
                                    this.refreshTokenTimeout = setTimeout(() => {
                                        this.refreshTokenTimeout = null;
                                        this.refreshToken();
                                    }, 1000 * 60);
                                }
                                return;
                            }
                        }
                        this.log.error(url);
                        this.log.error(error);
                        error.response && this.log.error(JSON.stringify(error.response.data));
                    });
            }
        }
    }
    async refreshToken() {
        if (!this.session) {
            this.log.error("No session found relogin");
            await this.login();
            return;
        }
        await this.requestClient({
            method: "patch",
            url: "https://swqapi.solarweb.com/iam/jwt/" + this.session.refreshToken,
            headers: this.baseHeader,
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.session = res.data;
                this.baseHeader["Authorization"] = "Bearer " + this.session.jwtToken;
                this.setState("info.connection", true, true);
            })
            .catch((error) => {
                this.log.error("refresh token failed");
                this.log.error(error);
                error.response && this.log.error(JSON.stringify(error.response.data));
                this.log.error("Start relogin in 1min");
                if (!this.reLoginTimeout) {
                    this.reLoginTimeout = setTimeout(() => {
                        this.reLoginTimeout = null;
                        this.login();
                    }, 1000 * 60 * 1);
                }
            });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.setState("info.connection", false, true);
            this.refreshTimeout && clearTimeout(this.refreshTimeout);
            this.reLoginTimeout && clearTimeout(this.reLoginTimeout);
            this.refreshTokenTimeout && clearTimeout(this.refreshTokenTimeout);
            this.updateInterval && clearInterval(this.updateInterval);
            this.refreshTokenInterval && clearInterval(this.refreshTokenInterval);
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (state) {
            if (!state.ack) {
                const deviceId = id.split(".")[2];
                const command = id.split(".")[4];
                if (id.split(".")[3] !== "remote") {
                    return;
                }

                if (command === "Refresh") {
                    this.updateDevices();
                }
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new FroniusSolarweb(options);
} else {
    // otherwise start the instance directly
    new FroniusSolarweb();
}
