import DiscordTransport from '../src/discord-transport.js';
import ElectronLog from "electron-log";
import { jest } from '@jest/globals';


describe('DiscordTransport', () => {

    describe('constructor', () => {
        it('should initialize attributes', () => {

            const options = {
                webhook: 'https://discord.com/api/webhooks/123456789/abcdefg',
                username: 'test-user',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
                electronLog: {},
                level: 'debug',
                transformFn: jest.fn(),
                reportErrorFn: jest.fn(),
            };

            const transport = new DiscordTransport(options);

            expect(transport.webhook).toBe(options.webhook);
            expect(transport.username).toBe(options.username);
            expect(transport.avatar).toBe(options.avatar);
            expect(transport.thumb).toBe(options.thumb);
            expect(transport.electronLog).toBe(options.electronLog);
            expect(transport.level).toBe(options.level);
            expect(transport.transformFn).toBe(options.transformFn);
            expect(transport.reportErrorFn).toBe(options.reportErrorFn);

        });

        it('should initialize level attribute as silly by default', () => {

            const transport = new DiscordTransport({});
            expect(transport.level).toBe('silly');
        });

        it('should initialize colors attribute', () => {

            const transport = new DiscordTransport({});

            expect(transport.colors).toHaveProperty('error');
            expect(transport.colors).toHaveProperty('warn');
            expect(transport.colors).toHaveProperty('info');
            expect(transport.colors).toHaveProperty('verbose');
            expect(transport.colors).toHaveProperty('debug');
            expect(transport.colors).toHaveProperty('silly');
            expect(transport.colors).toHaveProperty('log');
        });
    });

    describe('getFactory', () => {

        it('should return the transport method bound to the current instance and enable it to call the send method', () => {

            const transport = new DiscordTransport({});
            const sendMock = jest.fn();
            transport.send = sendMock;

            const transportMethod = transport.getFactory();

            transportMethod({ data: ['test'] });

            expect(sendMock).toHaveBeenCalledTimes(1);
        });

        it('should return the transport method exposing the level attribute', () => {

            const transport = new DiscordTransport({ level: 'debug' });
            const transportMethod = transport.getFactory();

            expect(transportMethod.level).toBe('debug');
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
                        description: "'test message'",
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
                            description: "'test message'",
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

            await transport.send({})
            expect(reportErrorMock).toHaveBeenCalledWith(new Error('fail'))

            global.fetch.mockRestore();
        });
    });

    describe('transform', () => {
        it('should call provided tranform function', () => {

            const transformFn = jest.fn();
            
            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
                transformFn
            });

            transport.transform({data: ['test message']});
            expect(transformFn).toHaveBeenCalledWith({data: ['test message']});
        });

        it('should return a string', () => {
            
            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
            });
            
            expect(typeof transport.transform({data: ['test message']})).toBe('string');
        });
    });

    describe('reportError', () => {
        it('should call provided reportError function', () => {
            const reportErrorFn = jest.fn();
            
            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png',
                reportErrorFn
            });

            transport.reportError(new Error('fail'));
            expect(reportErrorFn).toHaveBeenCalledWith(new Error('fail'));
        });

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

        it('should call console.error when no other report is available', () => {
            
            jest.spyOn(console, 'error')
                .mockImplementation(jest.fn());

            // Create instance
            const transport = new DiscordTransport({
                webhook: 'https://discord.com/api/webhooks/0/a',
                username: 'test',
                avatar: 'https://example.com/avatar.png',
                thumb: 'https://example.com/thumb.png'
            });
            
            transport.reportError(new Error('fail'));
            expect(console.error).toHaveBeenCalledTimes(1);

            console.error.mockRestore();
        });
    });
});