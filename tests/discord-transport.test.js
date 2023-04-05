import DiscordTransport from '../src/discord-transport.js';
import ElectronLog from 'electron-log';
import { describe, it, expect, jest } from '@jest/globals';


describe('DiscordTransport', () => {

    describe('constructor', () => {

        it('should throw an exception if webhook is not defined', () => {
            
            expect(() => new DiscordTransport({})).toThrow('webhook is required.');
        });

        it('should initialize attributes', () => {

            const electronLog = ElectronLog.create('test');

            const options = {
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test-user',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
                level: 'debug',
                electronLog
            };

            const transport = new DiscordTransport(options);

            expect(transport).toBeInstanceOf(DiscordTransport);
            expect(transport.webhook).toBe(options.webhook);
            expect(transport.username).toBe(options.username);
            expect(transport.avatar).toBe(options.avatar);
            expect(transport.thumb).toBe(options.thumb);
            expect(transport.level).toBe(options.level);
            expect(transport.electronLog).toBe(options.electronLog);
        });

        it('should initialize level attribute as silly by default', () => {

            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a'
            });
            expect(transport.level).toBe('silly');
        });

        it('should initialize colors attribute', () => {

            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a'
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
                webhook: 'https://discord.com/api/webhooks/0/a',
                electronLog
            });

            expect(electronLog.transports.discord).toBe(discordTransport.transport);
        });
    });

    describe('attachTo', () => {

        it('should attach it transport method to the Electron Log instance provided', () => {

            const electronLog = ElectronLog.create('test');

            const discordTransport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a'
            });

            discordTransport.attachTo(electronLog);

            expect(electronLog.transports.discord).toBe(discordTransport.transport);
        });
    });

    describe('getFactory', () => {

        it('should return the transport method bound to the current instance and enable it to call the send method', () => {

            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a'
            });
            const sendMock = jest.fn();
            transport.send = sendMock;

            const transportMethod = transport.getFactory();

            transportMethod({ data: ['test'] });

            expect(sendMock).toHaveBeenCalledTimes(1);
        });

        it('should return the transport method exposing the very current level attribute', () => {

            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                level: 'debug'
            });
            const transportMethod = transport.getFactory();

            expect(transportMethod.level).toBe('debug');

            transport.level = 'warn';

            expect(transportMethod.level).toBe('warn');
        });
    });

    describe('transport', () => {
        it('should call send method with a valid payload', () => {

            // Create instance and mock send method
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });
            const sendMock = jest.fn();
            transport.send = sendMock;

            // Get transport method and run
            const transportMethod = transport.getFactory();
            transportMethod({ data: ['test message'], level: 'debug', date: '0000-00-00T00:00:00.000Z' });

            // Check if send function received a valid payload
            expect(sendMock).toBeCalledWith({
                username: 'test',
                avatar_url: 'https://example.com/avatar.png',
                embeds: [
                    {
                        description: '\'test message\'',
                        thumbnail: {
                            url: 'https://example.com/thumb.png'
                        },
                        color: transport.colors.debug,
                        fields: [
                            {
                                name: 'Level',
                                value: 'debug',
                                inline: true
                            },
                            {
                                name: 'DateTime',
                                value: '0000-00-00T00:00:00.000Z',
                                inline: true
                            }
                        ]
                    }
                ]
            });
        });
    });

    describe('getPayload', () => {
        it('should return the payload that will be sent to Discord', () => {

            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            expect(transport.getPayload({ data: ['test message'], level: 'error', date: '0000-00-00T00:00:00.000Z' }))
                .toStrictEqual({
                    username: 'test',
                    avatar_url: 'https://example.com/avatar.png',
                    embeds: [
                        {
                            description: '\'test message\'',
                            thumbnail: {
                                url: 'https://example.com/thumb.png'
                            },
                            color: transport.colors.error,
                            fields: [
                                {
                                    name: 'Level',
                                    value: 'error',
                                    inline: true
                                },
                                {
                                    name: 'DateTime',
                                    value: '0000-00-00T00:00:00.000Z',
                                    inline: true
                                }
                            ]
                        }
                    ]
                });
        });
    });

    describe('send', () => {

        it('should send the transformed message to Discord', async () => {

            jest.spyOn(global, 'fetch')
                .mockImplementation(jest.fn(async () => ({
                    ok: true,
                    body: 'ok'
                })));

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            // Run and check mock
            await transport.send({});
            expect(fetch).toBeCalledWith('https://discord.com/api/webhooks/0/a', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            global.fetch.mockRestore();
        });

        it('should return the response body if completed successfully', async () => {

            jest.spyOn(global, 'fetch')
                .mockImplementation(jest.fn(async () => ({
                    ok: true,
                    body: 'ok'
                })));

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            // Run and check mock
            expect(await transport.send({})).toEqual('ok');

            global.fetch.mockRestore();
        });


        it('should report error if response status is not ok', async () => {

            jest.spyOn(global, 'fetch')
                .mockImplementation(jest.fn(async () => ({
                    ok: false
                })));

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            const reportErrorMock = jest.fn();
            transport.reportError = reportErrorMock;

            await transport.send({});
            expect(reportErrorMock).toHaveBeenCalledWith(new Error('ElectronLogDiscord: cannot send HTTP request to https://discord.com/api/webhooks/0/a'));

            global.fetch.mockRestore();
        });


        it('should report error if fails', async () => {

            jest.spyOn(global, 'fetch')
                .mockImplementation(jest.fn(async () => {
                    throw new Error('fail');
                }));

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });

            const reportErrorMock = jest.fn();
            transport.reportError = reportErrorMock;

            await transport.send({});
            expect(reportErrorMock).toHaveBeenCalledWith(new Error('fail'));

            global.fetch.mockRestore();
        });
    });

    describe('transform', () => {

        it('should return a string', () => {

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
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
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
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
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png'
            });

            transport.reportError(new Error('fail'));
            expect(console.warn).toHaveBeenCalledTimes(1);

            console.warn.mockRestore();
        });

        it('should report errors to every other custom transport', () => {

            const electronLog = ElectronLog.create('test');

            const discordTransport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
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