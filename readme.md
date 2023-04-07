# Electron Log Discord &middot; [![codecov](https://codecov.io/gh/giovani-plantae/electron-log-discord/branch/master/graph/badge.svg?token=SAFWI9SQ7W)](https://codecov.io/gh/giovani-plantae/electron-log-discord)
This is a class-based plugin for [Electron Log](https://github.com/megahertz/electron-log) that allows you to easily send logs to a Discord channel using webhooks.

Never created webhooks in Discord? Check out the [official article](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).

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

Create an instance of the `DiscordTransport` class, providing the `webhook URL` and the instance of `ElectronLog` that you want to use:
```js
new DiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
    electronLog: ElectronLog
});
```
This will automatically add the `DiscordTransport` to `ElectronLog`, so now, whenever you call a logging method (e.g. `ElectronLog.info`, `ElectronLog.warn`, `ElectronLog.error`), the message will be sent to the specified Discord channel.

Additionally, you can provide the `username` and `avatar` of the message author that will be displayed on the Discord channel. It's also possible to limit the log `level` that this transport will accept. All options are available below.

## Options
The following options can be passed to `DiscordTransport`:

- `webhook`: The Discord webhook URL to send the logs to. (required)
- `username`: The username to use when sending the logs.
- `avatar`: The avatar URL to use when sending the logs.
- `thumb`: The thumb URL to use when sending the logs.
- `level`: The log level to use when sending the logs. (default: 'silly')
- `electronLog`: The `ElectronLog` instance to use for logging.

# Examples
## Sending logs only above a certain level
You can configure `DiscordTransport` to only send logs above a certain level by setting the level option. For example, to only send logs at the 'warn' level or above:

```js
new DiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
    level: 'warn', // error, warn, info, verbose, debug, silly, log
});
```

## Customizing the appearance of the messages
You can customize the appearance of the messages by extending the `DiscordTransport` class and overriding the `getPayload` method. By default, getPayload returns an object with the message text and some metadata. You can modify this object to include additional fields or change the appearance of the message. For example, this modification will arrange the log in a way that the description comes after the level and datetime information.

```js
class CustomDiscordTransport extends DiscordTransport {
    getPayload(message) {

        const embed = new EmbedBuilder()
            .setThumbnail(this.thumb)
            .setColor(this.colors[message.level])
            .addFields(
                {
                    name: 'Level',
                    value: message.level,
                    inline: true
                },
                {
                    name: 'DateTime',
                    value: message.date.toISOString(),
                    inline: true
                },
                {
                    name: 'Description',
                    value: this.transform(message),
                }
            );

        return {
            username: this.username,
            avatarURL: this.avatar,
            embeds: [embed]
        };
    }
}

new CustomDiscordTransport({
    webhook: 'https://discord.com/api/webhooks/...',
});
```

You can check the [official Discord guide](https://discord.com/developers/docs/resources/webhook) for more details and options about how webhooks work.