# Electron Log Discord
This is a class-based plugin for `Electron Log` that allows you to easily send logs to a Discord channel using webhooks.

# Installation
Install using npm:

```bash
npm install electron-log-discord
```

# Usage

Import the required classes:

```js
import ElectronLog from 'electron-log';
import DiscordTransport from 'electron-log-discord';
```

Create an instance of the DiscordTransport class:
```js
const transport = new DiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
    username: 'My App',
    avatar: 'https://example.com/my-app-avatar.png',
    level: 'warn',
    electronLog: ElectronLog
});
```
Here, we're passing the webhook URL, the username and avatar that will be displayed in the Discord channel, the logging level, and the ElectronLog instance that we want to use.
Finally, we register the transport with `ElectronLog`:

```js
ElectronLog.transports.discord = transport.getFactory();
```
Now, whenever you call a logging method (e.g. `ElectronLog.info`, `ElectronLog.warn`, `ElectronLog.error`), the message will be sent to the specified Discord channel.

## Options
The following options can be passed to DiscordTransport:

- `webhook`: The Discord webhook URL to send the logs to. (required)
- `username`: The username to use when sending the logs.
- `avatar`: The avatar URL to use when sending the logs.
- `thumb`: The thumb URL to use when sending the logs.
- `electronLog`: The ElectronLog instance to use for logging errors.
- `level`: The log level to use when sending the logs. (default: 'silly')

# Examples
## Sending logs only above a certain level
You can configure `DiscordTransport` to only send logs above a certain level by setting the level option. For example, to only send logs at the 'warn' level or above:

```js
const transport = new DiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
    level: 'warn',
});
```

## Customizing the appearance of the messages
You can customize the appearance of the messages by extending the `DiscordTransport` class and overriding the `getPayload` method. By default, getPayload returns an object with the message text and some metadata. You can modify this object to include additional fields or change the appearance of the message. For example, this modification will arrange the log in a way that the description comes after the level and datetime information.

```js
class CustomDiscordTransport extends DiscordTransport {
    getPayload(message) {

        return {
            username: this.username,
            avatar_url: this.avatar,
            embeds: [
                {
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
                        },
                        {
                            name: 'Description',
                            value: this.transform(message),
                        }
                    ]
                }
            ]
        };
    }
}

const transport = new CustomDiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
});
```

You can check the [official Discord guide](https://discord.com/developers/docs/resources/webhook) for more details and options about how webhooks work.