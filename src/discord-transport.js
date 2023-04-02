import Util from "util";

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
     * @param {Function} options.transformFn - The function to use for transforming the log message.
     * @param {Function} options.reportErrorFn - The function to use for reporting errors.
     */
    constructor(options) {

        this.webhook = options.webhook;
        this.username = options.username;
        this.avatar = options.avatar;
        this.thumb = options.thumb;
        this.electronLog = options.electronLog;
        this.level = options.level ?? 'silly';
        this.transformFn = options.transformFn;
        this.reportErrorFn = options.reportErrorFn;

        this.colors = {
            error: 0xF44336,
            warn: 0xFFC107,
            info: 0x2196F3,
            verbose: 0x9C27B0,
            debug: 0x4CAF50,
            silly: 0x607D8B,
            log: 0x333333,
        };
    }

    /**
     * Returns the transport method bound to the current instance.
     * @returns {Function} - The transport method bound to the current instance.
     */
    getFactory() {

        let transport = this.transport.bind(this);
        transport.level = this.level;

        return transport;
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
        }
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
                    throw new Error(`Erro ao enviar a mensagem: ${response.status} ${response.statusText}`);
                
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

        if (this.transformFn && typeof this.transformFn == 'function')
            return this.transformFn(message);

        else
            return Util.inspect(message.data.pop(), true);
    }

    /**
     * Reports the given error using the configured report error function or the console.
     * @param {Error} error - The error to report.
     */
    reportError(error) {

        if (this.reportErrorFn && typeof this.reportErrorFn == 'function')
            return this.reportErrorFn(error);

        if (this.electronLog?.logMessageWithTransports) 

            return this.electronLog.logMessageWithTransports(
                {
                    data: [
                        `ElectronLogDiscord: cannot send HTTP request to ${this.webhook}`,
                        error
                    ],
                    level: 'warn',
                },
                [
                    this.electronLog.transports.console,
                    this.electronLog.transports.ipc,
                    this.electronLog.transports.file,
                    this.electronLog.transports.remote
                ]
            );

        console.error(error);
    }
}