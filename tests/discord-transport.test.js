import DiscordTransport from '../src/discord-transport.js';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import ElectronLog from 'electron-log';
import { describe, it, expect, jest } from '@jest/globals';


describe('DiscordTransport', () => {

    function generateValidWebHookUrl() {
        const webhookId = Math.floor(Math.random() * 1000000000000000000).toString().padStart(18, '0');
        const webhookToken = Array(68).fill(null).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        return `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
    }

    describe('constructor', () => {

        it('should throw an exception if webhook is not defined', () => {

            expect(() => new DiscordTransport({})).toThrow('webhook is required.');
        });

        it('should initialize attributes', () => {

            const electronLog = ElectronLog.create('test');

            const options = {
                webhook: generateValidWebHookUrl(),
                username: 'test-user',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
                level: 'debug',
                electronLog
            };

            const transport = new DiscordTransport(options);

            expect(transport).toBeInstanceOf(DiscordTransport);
            expect(transport.webhook).toBeInstanceOf(WebhookClient);
            expect(transport.username).toBe(options.username);
            expect(transport.avatar).toBe(options.avatar);
            expect(transport.thumb).toBe(options.thumb);
            expect(transport.level).toBe(options.level);
            expect(transport.electronLog).toBe(options.electronLog);
        });

        it('should initialize level attribute as silly by default', () => {

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });
            expect(transport.level).toBe('silly');
        });

        it('should initialize colors attribute', () => {

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            expect(transport.colors).toHaveProperty('error');
            expect(transport.colors).toHaveProperty('warn');
            expect(transport.colors).toHaveProperty('info');
            expect(transport.colors).toHaveProperty('verbose');
            expect(transport.colors).toHaveProperty('debug');
            expect(transport.colors).toHaveProperty('silly');
            expect(transport.colors).toHaveProperty('log');
        });

        it('should attach it transport method to the Electron Log instance automatically when provided', () => {

            const electronLog = ElectronLog.create('test');

            const discordTransport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                electronLog
            });

            expect(electronLog.transports.discord).toBe(discordTransport.transport);
        });
    });

    describe('attachTo', () => {

        it('should attach it transport method to the Electron Log instance provided', () => {

            const electronLog = ElectronLog.create('test');

            const discordTransport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            discordTransport.attachTo(electronLog);

            expect(electronLog.transports.discord).toBe(discordTransport.transport);
        });
    });

    describe('getFactory', () => {

        it('should return the transport method bound to the current instance and enable it to call the send method', () => {

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            const sendMock = jest.spyOn(transport, 'send')
                .mockImplementation(jest.fn());

            const electronLog = ElectronLog.create('test');
            electronLog.transports.discord = transport.getFactory();
            electronLog.log('test');

            expect(sendMock).toHaveBeenCalledTimes(1);
        });

        it('should return the transport method exposing the very current level attribute', () => {

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                level: 'debug'
            });
            const transportMethod = transport.getFactory();

            expect(transportMethod.level).toBe('debug');

            transport.level = 'warn';
            expect(transportMethod.level).toBe('warn');

            transportMethod.level = 'error';
            expect(transport.level).toBe('error');
        });
    });

    describe('transport', () => {

        it('should be called if the log level is greater than or equal to the level defined in the class', () => {

            const electronLog = ElectronLog.create('test');
            electronLog.transports.console.level = false;

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                level: 'warn',
                electronLog
            });

            const sendMock = jest.spyOn(transport, 'send')
                .mockImplementation(jest.fn());

            electronLog.debug('test message');
            electronLog.info('test message');
            electronLog.warn('test message');
            electronLog.error('test message');

            expect(sendMock).toBeCalledTimes(2);
        });

        it('should be ignored if the log level is below the level defined in the class', () => {

            const electronLog = ElectronLog.create('test');
            electronLog.transports.console.level = false;

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                level: 'warn',
                electronLog
            });

            const sendMock = jest.spyOn(transport, 'send')
                .mockImplementation(jest.fn());

            electronLog.info('test message');
            electronLog.debug('test message');
            electronLog.verbose('test message');
            electronLog.silly('test message');

            expect(sendMock).not.toBeCalled();
        });

        it('should call send method with the send message', () => {

            const electronLog = ElectronLog.create('test');
            electronLog.transports.console.level = false;

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                electronLog
            });

            const sendMock = jest.spyOn(transport, 'send')
                .mockImplementation(async () => {});

            electronLog.info('test message');

            expect(sendMock.mock.calls[0][0].embeds[0].data.description).toBe('\'test message\'');
        });
    });

    describe('getPayload', () => {

        it('should return the payload that will be sent to Discord', () => {

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            const date = new Date();

            expect(transport.getPayload({ data: ['test message'], level: 'error', date }))
                .toStrictEqual({
                    username: 'test',
                    avatarURL: 'https://example.com/avatar.png',
                    embeds: [
                        new EmbedBuilder()
                            .setDescription('\'test message\'')
                            .setThumbnail('https://example.com/thumb.png')
                            .setColor(transport.colors.error)
                            .addFields(
                                {
                                    name: 'Level',
                                    value: 'error',
                                    inline: true
                                },
                                {
                                    name: 'DateTime',
                                    value: date.toISOString(),
                                    inline: true
                                }
                            )
                    ]
                });
        });
    });

    describe('send', () => {

        it('should send the transformed message to Discord', async () => {

            const electronLog = ElectronLog.create('test');

            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                electronLog
            });

            const sendMock = jest.spyOn(transport.webhook, 'send')
                .mockImplementation(jest.fn(async () => {}));

            electronLog.info('test message');

            expect(sendMock.mock.calls[0][0].embeds[0].data.description).toBe('\'test message\'');
        });

        it('should return the response body if completed successfully', async () => {

            // Create instance
            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            jest.spyOn(transport.webhook, 'send')
                .mockImplementation(jest.fn(async () => ({id: '1'})));

            // Run and check mock
            expect(await transport.send({})).toEqual({id: '1'});
        });


        it('should report error if it fails', async () => {

            // Create instance
            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            jest.spyOn(transport.webhook, 'send')
                .mockImplementation(jest.fn(async () => {
                    throw new Error('fail');
                }));

            const reportErrorMock = jest.spyOn(transport, 'reportError')
                .mockImplementation(jest.fn(async () => {}));

            await transport.send({});
            expect(reportErrorMock).toHaveBeenCalledWith(new Error('fail'));
        });
    });

    describe('transform', () => {

        it('should return a string', () => {

            // Create instance
            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            expect(typeof transport.transform({ data: ['test message'] })).toBe('string');
        });
    });

    describe('reportError', () => {

        it('should call logMessageWithTransports when Electron Log instance is provided', () => {

            jest.spyOn(ElectronLog, 'logMessageWithTransports')
                .mockImplementation(jest.fn());

            // Create instance
            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                electronLog: ElectronLog
            });

            transport.reportError(new Error('fail'));
            expect(ElectronLog.logMessageWithTransports).toHaveBeenCalledTimes(1);

            ElectronLog.logMessageWithTransports.mockRestore();
        });

        it('should call console.warn when Electron Log instance is not provided', () => {

            jest.spyOn(console, 'warn')
                .mockImplementation(jest.fn());

            // Create instance
            const transport = new DiscordTransport({
                webhook: generateValidWebHookUrl()
            });

            transport.reportError(new Error('fail'));
            expect(console.warn).toHaveBeenCalledTimes(1);

            console.warn.mockRestore();
        });

        it('should report errors to every other custom transport', () => {

            const electronLog = ElectronLog.create('test');

            const discordTransport = new DiscordTransport({
                webhook: generateValidWebHookUrl(),
                electronLog
            });

            const another = jest.fn();
            another.level = 'silly';
            electronLog.transports.another = another;

            electronLog.transports.console.level = false;

            discordTransport.reportError(new Error('fail'));

            expect(another).toHaveBeenCalledTimes(1);
            expect(another).toHaveBeenCalledWith(expect.objectContaining({ data: [new Error('fail')] }));
        });
    });
});