import Util from 'util';

export default class DiscordTransport {

    /**
     * Creates a new instance of the DiscordTransport class.
     * @param {Object} options - The options to configure the transport.
     * @param {string} options.webhook - The Discord webhook URL to send the logs to.
     * @param {string} options.username - The username to use when sending the logs.
     * @param {string} options.avatar - The avatar URL to use when sending the logs.
     * @param {string} options.thumb - The thumb URL to use when sending the logs.
     * @param {Object} options.electronLog - The ElectronLog instance to use for logging errors.
     * @param {string} options.level - The log level to use when sending the logs.
     */
    constructor(options = {}) {

        if (!options.webhook)
            throw new Error('webhook is required.');

        this.webhook = options.webhook;
        this.username = options.username ?? null;
        this.avatar = options.avatar ?? null;
        this.thumb = options.thumb ?? null;
        this.level = options.level ?? 'silly';

        this.colors = {
            error: 0xF44336,
            warn: 0xFFC107,
            info: 0x2196F3,
            verbose: 0x9C27B0,
            debug: 0x4CAF50,
            silly: 0x607D8B,
            log: 0x333333,
        };

        this.bindTransportMethod();

        if (options.electronLog)
            this.attachTo(options.electronLog);
    }

    /**
     * Binds the transport method to the current instance and defines a level property on it.
     */
    bindTransportMethod() {

        this.transport = this.transport.bind(this);

        Object.defineProperty(this.transport, 'level', {
            get: () => this.level
        });
    }

    /**
     * Attaches the current transport instance to a given Electron Log instance.
     * @param {Object} electronLog - The Electron Log instance to attach to.
     * @returns {this} - The current DiscordTransport instance.
     */
    attachTo(electronLog) {

        this.electronLog = electronLog;
        this.electronLog.transports.discord = this.getFactory();
        return this;
    }

    /**
     * Returns the transport method bound to the current instance.
     * @returns {Function} - The transport method bound to the current instance.
     */
    getFactory() {

        return this.transport;
    }

    /**
     * Transports the given message to Discord.
     * @param {Object} message - The message to send.
     */
    transport(message) {

        this.send(this.getPayload(message));
    }

    /**
     * Returns the payload object expected by Discord.
     * @param {Object} message - The message to generate the payload for.
     * @returns {Object} - The payload object to send to Discord.
     */
    getPayload(message) {

        return {
            username: this.username,
            avatar_url: this.avatar,
            embeds: [
                {
                    description: this.transform(message),
                    thumbnail: {
                        url: this.thumb
                    },
                    color: this.colors[message.level],
                    fields: [
                        {
                            name: 'Level',
                            value: message.level,
                            inline: true
                        },
                        {
                            name: 'DateTime',
                            value: message.date,
                            inline: true
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Sends the payload object to Discord via the configured webhook URL.
     * @param {Object} payload - The payload object to send to Discord.
     * @returns {Promise} - A Promise that resolves when the payload has been sent successfully.
     */
    async send(payload) {

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        };

        return fetch(this.webhook, options)
            .then(response => {
                if (!response.ok)
                    throw new Error(`ElectronLogDiscord: cannot send HTTP request to ${this.webhook}`);

                return response.body;
            })
            .catch(this.reportError.bind(this));
    }

    /**
     * Transforms the log message using the configured transform function or util.inspect.
     * @param {Object} message - The log message to transform.
     * @returns {string} - The transformed log message.
     */
    transform(message) {

        return Util.inspect(message.data.pop(), true);
    }

    /**
     * Reports the given error using the configured report error function or the console.
     * @param {Error} error - The error to report.
     */
    reportError(error) {

        if (!this.electronLog?.logMessageWithTransports) {
            console.warn(error);
            return;
        }

        const transportStack = new Set(Object.values(this.electronLog.transports));
        transportStack.delete(this.transport);

        this.electronLog.logMessageWithTransports(
            {
                data: [error],
                level: 'warn',
            },
            Array.from(transportStack)
        );
    }
}