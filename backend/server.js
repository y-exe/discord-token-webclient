require('dotenv').config();
const http = require('http');
const express = require('express');
const axios = require('axios');
const { Server } = require("socket.io");
const cors = require('cors');

// Selfbot用 (User Token)
const { Client: SelfClient } = require('discord.js-selfbot-v13');

// 公式Bot用 (Bot Token)
let BotClient, GatewayIntentBits, Partials, ChannelType;
try {
    const Discord = require('discord.js');
    BotClient = Discord.Client;
    GatewayIntentBits = Discord.GatewayIntentBits;
    Partials = Discord.Partials;
    ChannelType = Discord.ChannelType;
} catch (e) {
    console.log("discord.js (v14) is not installed. Bot mode might not work properly.");
}

const app = express();
app.use(cors({ origin: "*" }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const sessions = new Map();
const voiceConnections = new Map();

// 音声関連ライブラリ
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, VoiceConnectionStatus, entersState, EndBehaviorType } = require('@discordjs/voice');
const { PassThrough } = require('stream');

app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('URL is required');
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) { res.status(500).send('Failed'); }
});

// チャンネルタイプ判定用ヘルパー (v13文字列 / v14数値を吸収)
const isCategory = (type) => type === 'GUILD_CATEGORY' || type === 4; // 4: GuildCategory
const isText = (type) => type === 'GUILD_TEXT' || type === 0; // 0: GuildText
const isVoice = (type) => type === 'GUILD_VOICE' || type === 2; // 2: GuildVoice
const isStage = (type) => type === 'GUILD_STAGE_VOICE' || type === 13; // 13: GuildStageVoice
const isForum = (type) => type === 'GUILD_FORUM' || type === 15; // 15: GuildForum
const isNews = (type) => type === 'GUILD_NEWS' || type === 5; // 5: GuildAnnouncement

const getChannelsWithMembers = (guild) => {
    if (!guild) return [];
    const cache = guild.channels.cache;
    
    // カテゴリー抽出
    const allCategories = cache.filter(c => isCategory(c.type))
        .sort((a,b) => a.rawPosition - b.rawPosition);
    
    // スレッド抽出
    const allThreads = cache.filter(c => c.isThread?.() || [10, 11, 12].includes(c.type));
    
    // メインチャンネル抽出 (カテゴリー・スレッド以外)
    const mainChannels = cache.filter(c => 
        !isCategory(c.type) && 
        !c.isThread?.() && 
        c.viewable
    ).sort((a,b) => {
        const isVoiceA = (isVoice(a.type) || isStage(a.type));
        const isVoiceB = (isVoice(b.type) || isStage(b.type));
        if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
        return a.rawPosition - b.rawPosition;
    });

    const mapChannel = (c) => ({
        id: c.id, 
        name: c.name, 
        type: c.type, // v14なら数値、v13なら文字列
        members: (isVoice(c.type) || isStage(c.type)) ? c.members.map(m => ({
            id: m.id, 
            username: m.displayName, 
            avatar: m.user.displayAvatarURL({ format: 'png' })
        })) : [],
        threads: allThreads
            .filter(t => t.parentId === c.id)
            .map(t => ({
                id: t.id, 
                name: t.name, 
                type: t.type,
                lastMessageTimestamp: t.lastMessageId ? (Number(BigInt(t.lastMessageId) >> 22n) + 1420070400000) : t.createdTimestamp,
                messageCount: t.messageCount || 0
            }))
            .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    });

    const result = [];
    const uncategorized = { id: "uncategorized", name: null, channels: mainChannels.filter(c => !c.parentId).map(mapChannel) };
    if (uncategorized.channels.length > 0) result.push(uncategorized);
    
    allCategories.forEach(cat => {
        const catChannels = mainChannels.filter(c => c.parentId === cat.id).map(mapChannel);
        result.push({ id: cat.id, name: cat.name, channels: catChannels });
    });
    return result;
};

const formatMessage = (m) => {
    if (!m || !m.author) return null;
    return {
        id: m.id, content: m.content, timestamp: m.createdTimestamp,
        author: {
            id: m.author.id, username: m.author.username,
            displayName: m.member ? m.member.displayName : m.author.username,
            avatar: m.author.displayAvatarURL({ format: 'png' }),
            color: m.member ? m.member.displayHexColor : null,
        },
        attachments: m.attachments.map(a => ({ url: a.url })),
        embeds: m.embeds,
        reactions: m.reactions.cache.filter(r => r.count > 0).map(r => ({ 
            emoji: { name: r.emoji.name, id: r.emoji.id, url: r.emoji.id ? `https://cdn.discordapp.com/emojis/${r.emoji.id}.png` : null }, 
            count: r.count, me: r.me 
        })),
        channelId: m.channel.id,
        replyTo: m.reference ? { id: m.reference.messageId } : null
    };
};

io.on('connection', (socket) => {
    socket.on('login', async ({ token, isBot }) => {
        let client;

        // Botとユーザー分岐
        if (isBot && BotClient) {
            console.log("Initializing Bot Client...");
            client = new BotClient({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildVoiceStates,
                    GatewayIntentBits.GuildMessageReactions
                ],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
            });
        } else {
            console.log("Initializing Selfbot Client...");
            client = new SelfClient({ checkUpdate: false });
        }

        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag} (${isBot ? 'Bot' : 'User'})`);
            sessions.set(socket.id, client);
            socket.emit('login-success', { user: { id: client.user.id, username: client.user.username, avatar: client.user.displayAvatarURL({ format: 'png' }) } });
            
            // イベリス
            const onMessageCreate = (m) => { if(m.channelId === socket.currentChannelId) socket.emit('newMessage', formatMessage(m)); };
            const onMessageUpdate = (old, m) => { if(m.channelId === socket.currentChannelId) socket.emit('messageUpdate', formatMessage(m)); };
            const onMessageDelete = (m) => { if(m.channelId === socket.currentChannelId) socket.emit('messageDelete', { id: m.id }); };
            
            client.on('messageCreate', onMessageCreate);
            client.on('messageUpdate', onMessageUpdate);
            client.on('messageDelete', onMessageDelete);

            const handleReactionChange = async (reaction) => {
                if (reaction.message.channelId === socket.currentChannelId) {
                    try { const updatedMsg = await reaction.message.fetch(true); socket.emit('messageUpdate', formatMessage(updatedMsg)); } catch (e) {}
                }
            };
            client.on('messageReactionAdd', handleReactionChange);
            client.on('messageReactionRemove', handleReactionChange);
            
            client.on('voiceStateUpdate', () => {
                if (socket.currentGuildId) {
                    const g = client.guilds.cache.get(socket.currentGuildId);
                    if(g) socket.emit('channelsUpdate', getChannelsWithMembers(g));
                }
            });
        });

        try { 
            await client.login(token); 
        } catch (e) { 
            console.error("Login Failed:", e.message);
            socket.emit('login-error', e.message); 
        }
    });

    socket.on('getGuilds', (cb) => {
        const client = sessions.get(socket.id);
        if(!client) return cb([]);
        cb(client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL({ format: 'png' }), acronym: g.name.replace(/\w+/g, n=>n[0]).slice(0,3).toUpperCase() })));
    });

    socket.on('getChannels', (guildId, cb) => {
        const client = sessions.get(socket.id);
        const guild = client?.guilds.cache.get(guildId);
        if(!guild) return cb([]);
        socket.currentGuildId = guildId;
        cb(getChannelsWithMembers(guild));
    });

    socket.on('getMessages', async (data, cb) => {
        const client = sessions.get(socket.id);
        const channelId = typeof data === 'string' ? data : data.channelId;
        const before = typeof data === 'object' ? data.before : null;
        socket.currentChannelId = channelId;
        try {
            const ch = await client.channels.fetch(channelId);
            const fetchOptions = { limit: 50 };
            if (before) fetchOptions.before = before;
            const msgs = await ch.messages.fetch(fetchOptions);
            cb(Array.from(msgs.values()).reverse().map(formatMessage).filter(m => m));
        } catch(e) { cb([]); }
    });

    socket.on('getUserProfile', async ({ userId, guildId }, cb) => {
        const client = sessions.get(socket.id);
        if (!client) return cb(null);
        try {
            // Botでは force: true が使える場合が多いが、安全のためキャッシュ優先
            let user = client.users.cache.get(userId);
            if (!user) user = await client.users.fetch(userId);
            
            const guild = guildId ? client.guilds.cache.get(guildId) : null;
            const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
            cb({
                id: user.id, username: user.tag, displayName: member?.displayName || user.username,
                avatar: user.displayAvatarURL({ format: 'png', size: 256 }),
                banner: (typeof user.bannerURL === 'function') ? user.bannerURL({ format: 'png', size: 600 }) : null,
                accentColor: user.hexAccentColor || '#5865F2',
                createdAt: user.createdTimestamp,
                status: member?.presence?.status || 'offline',
                roles: member ? member.roles.cache.filter(r => r.name !== '@everyone').sort((a,b) => b.position - a.position).map(r => ({ name: r.name, color: r.hexColor })) : []
            });
        } catch (e) { cb(null); }
    });

    socket.on('getGuildEmojis', (guildId, cb) => {
        const guild = sessions.get(socket.id)?.guilds.cache.get(guildId);
        cb(guild ? guild.emojis.cache.map(e => ({ id: e.id, name: e.name, url: e.url })) : []);
    });

    socket.on('sendMessage', async (d) => {
        const client = sessions.get(socket.id);
        if (!client) return;
        try {
            const ch = await client.channels.fetch(d.channelId);
            if(ch) {
                const options = {};
                if (d.reply) options.reply = { messageReference: d.reply.messageId };
                await ch.send(d.content, options);
            }
        } catch (e) { console.error('SendMessage Error:', e.message); }
    });

    socket.on('addReaction', async (d) => {
        try {
            const client = sessions.get(socket.id);
            const ch = await client?.channels.fetch(d.channelId);
            const msg = await ch?.messages.fetch(d.messageId);
            if (msg) {
                const emoji = d.emoji.includes(':') ? d.emoji.split(':').pop() : d.emoji;
                await msg.react(emoji);
            }
        } catch (e) { console.error('AddReaction Error:', e.message); }
    });

    socket.on('removeReaction', async (d) => {
        try {
            const client = sessions.get(socket.id);
            const ch = await client?.channels.fetch(d.channelId);
            const msg = await ch?.messages.fetch(d.messageId);
            if (msg) {
                const reaction = msg.reactions.cache.find(r => 
                    r.emoji.id === d.emoji || r.emoji.name === d.emoji || (r.emoji.id && d.emoji.includes(r.emoji.id))
                );
                // Botの場合は自分(client.user)のリアクションのみ消すのが基本だが、
                // 自己削除なら remove() でいける
                if (reaction) await reaction.users.remove(client.user.id);
            }
        } catch (e) { console.error('RemoveReaction Error:', e.message); }
    });

    socket.on('editMessage', async (d) => {
        try {
            const ch = await sessions.get(socket.id)?.channels.fetch(d.channelId);
            const msg = await ch?.messages.fetch(d.messageId);
            if (msg) await msg.edit(d.content);
        } catch (e) { console.error(e.message); }
    });

    socket.on('deleteMessage', async (d) => {
        try {
            const ch = await sessions.get(socket.id)?.channels.fetch(d.channelId);
            const msg = await ch?.messages.fetch(d.messageId);
            if (msg) await msg.delete();
        } catch (e) { console.error(e.message); }
    });

    // --- VC関連 (Botでも一応動作するが、Selfbot用アダプタを使っているため注意) ---
    socket.on('join-voice', async ({ channelId }) => {
        const client = sessions.get(socket.id);
        if (!client) return;
        try {
            const channel = await client.channels.fetch(channelId);
            const connection = joinVoiceChannel({ 
                channelId: channel.id, 
                guildId: channel.guild.id, 
                adapterCreator: channel.guild.voiceAdapterCreator, 
                selfMute: false, 
                selfDeaf: false 
            });
            await entersState(connection, VoiceConnectionStatus.Ready, 5000);
            
            const player = createAudioPlayer();
            const voiceStream = new PassThrough();
            player.play(createAudioResource(voiceStream, { inputType: StreamType.Arbitrary }));
            connection.subscribe(player);

            // Botで音声受信するには受信権限が必要な場合があるが、とりあえず実装
            connection.receiver.speaking.on('start', (userId) => {
                const audio = connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 100 } });
                audio.on('data', (chunk) => { socket.emit('voice-audio', chunk); });
            });

            voiceConnections.set(socket.id, { connection, player, voiceStream });
            socket.emit('voice-joined-success', { channelId });
        } catch (e) { socket.emit('voice-error', e.message); }
    });

    socket.on('audio-data', (data) => {
        const vc = voiceConnections.get(socket.id);
        if (vc?.voiceStream) vc.voiceStream.write(Buffer.from(data));
    });

    socket.on('leave-voice', () => {
        const vc = voiceConnections.get(socket.id);
        if (vc) { vc.connection.destroy(); voiceConnections.delete(socket.id); }
    });

    socket.on('disconnect', () => {
        const vc = voiceConnections.get(socket.id);
        if (vc) vc.connection.destroy();
        sessions.delete(socket.id);
    });
});

server.listen(8000, () => console.log('Backend Online: 8000'));