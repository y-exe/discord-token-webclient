require('dotenv').config();
const http = require('http');
const express = require('express');
const axios = require('axios');
const { Server } = require("socket.io");
const cors = require('cors');

const { Client: SelfClient } = require('discord.js-selfbot-v13');
let BotClient, GatewayIntentBits, Partials;
try {
    const Discord = require('discord.js');
    BotClient = Discord.Client;
    GatewayIntentBits = Discord.GatewayIntentBits;
    Partials = Discord.Partials;
} catch (e) {}

const app = express();
app.use(cors({ origin: "*" }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

const sessions = new Map();
const loginQueue = new Set(); 

app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('URL is required');
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) { res.status(500).send('Failed'); }
});

const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + 1420070400000;

const getDMChannels = async (client) => {
    const dms = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM' || c.type === 1 || c.type === 3);
    return Array.from(dms.values()).map(c => {
        const recipient = c.type === 'DM' || c.type === 1 ? c.recipient : null;
        return {
            id: c.id,
            name: c.type === 'GROUP_DM' || c.type === 3 ? (c.name || "グループDM") : (recipient ? recipient.username : "不明なユーザー"),
            avatar: recipient ? recipient.displayAvatarURL({ format: 'png' }) : null,
            type: c.type,
            lastMessageId: c.lastMessageId,
            lastMessageTimestamp: c.lastMessageId ? snowflakeToTimestamp(c.lastMessageId) : 0
        };
    }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
};

const getChannelsWithMembers = (guild) => {
    if (!guild) return [];
    const cache = guild.channels.cache;
    const allCategories = cache.filter(c => c.type === 'GUILD_CATEGORY' || c.type === 4).sort((a,b) => a.rawPosition - b.rawPosition);
    const allThreads = cache.filter(c => c.isThread?.() || [10, 11, 12].includes(c.type));
    
    const mainChannels = cache.filter(c => !c.isThread?.() && c.type !== 'GUILD_CATEGORY' && c.type !== 4 && c.viewable)
        .sort((a,b) => {
            const isVoiceA = (a.type === 'GUILD_VOICE' || a.type === 'GUILD_STAGE_VOICE' || a.type === 2 || a.type === 13);
            const isVoiceB = (b.type === 'GUILD_VOICE' || b.type === 'GUILD_STAGE_VOICE' || b.type === 2 || b.type === 13);
            if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
            return a.rawPosition - b.rawPosition;
        });

    const mapChannel = (c) => ({
        id: c.id, name: c.name, type: c.type,
        members: (c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE' || c.type === 2 || c.type === 13) ? c.members.map(m => ({
            id: m.id, username: m.displayName, avatar: m.user.displayAvatarURL({ format: 'png' })
        })) : [],
        threads: allThreads.filter(t => t.parentId === c.id).map(t => ({
            id: t.id, name: t.name, type: t.type,
            lastMessageTimestamp: t.lastMessageId ? snowflakeToTimestamp(t.lastMessageId) : t.createdTimestamp,
            messageCount: t.messageCount || 0
        })).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
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

const destroySession = (id) => {
    const client = sessions.get(id);
    if (client) {
        console.log(`[System] Clearing session: ${id}`);
        try { client.destroy(); } catch (e) {}
        sessions.delete(id);
    }
    loginQueue.delete(id);
};

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('login', async ({ token, isBot }) => {
        if (sessions.has(socket.id) || loginQueue.has(socket.id)) return;
        
        loginQueue.add(socket.id);
        console.log(`[Auth] Login attempt: ${isBot ? 'Bot' : 'User'}`);

        let client;
        if (isBot && BotClient) {
            client = new BotClient({
                intents: [1, 2, 8, 512, 32768, 16384],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
            });
        } else {
            client = new SelfClient({ checkUpdate: false });
        }

        const handleReady = () => {
            loginQueue.delete(socket.id);
            if (sessions.has(socket.id)) return;
            
            console.log(`[Auth] Ready: ${client.user.tag}`);
            sessions.set(socket.id, client);
            socket.emit('login-success', { user: { id: client.user.id, username: client.user.username, avatar: client.user.displayAvatarURL({ format: 'png' }) } });
            
            client.on('messageCreate', (m) => { if(m.channelId === socket.currentChannelId) socket.emit('newMessage', formatMessage(m)); });
            client.on('messageUpdate', (old, m) => { if(m.channelId === socket.currentChannelId) socket.emit('messageUpdate', formatMessage(m)); });
            client.on('messageDelete', (m) => { if(m.channelId === socket.currentChannelId) socket.emit('messageDelete', { id: m.id }); });
            
            const handleReactionChange = async (reaction) => {
                if (reaction.message.channelId === socket.currentChannelId) {
                    try { const updatedMsg = await reaction.message.fetch(true); socket.emit('messageUpdate', formatMessage(updatedMsg)); } catch (e) {}
                }
            };
            client.on('messageReactionAdd', handleReactionChange);
            client.on('messageReactionRemove', handleReactionChange);
        };

        client.on('ready', handleReady);
        client.on('clientReady', handleReady);
        
        try { 
            await client.login(token); 
        } catch (e) { 
            loginQueue.delete(socket.id);
            socket.emit('login-error', e.message); 
        }
    });

    socket.on('getGuilds', (cb) => {
        const client = sessions.get(socket.id);
        if(!client) return cb([]);
        cb(client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL({ format: 'png' }), acronym: g.name.replace(/\w+/g, n=>n[0]).slice(0,3).toUpperCase() })));
    });

    socket.on('getChannels', async (guildId, cb) => {
        const client = sessions.get(socket.id);
        if(!client) return cb([]);
        socket.currentGuildId = guildId;
        if (guildId === '@me') {
            const dms = await getDMChannels(client);
            return cb([{ id: "dms", name: "ダイレクトメッセージ", channels: dms }]);
        }
        const guild = client.guilds.cache.get(guildId);
        if(!guild) return cb([]);
        cb(getChannelsWithMembers(guild));
    });

    socket.on('getMessages', async (data, cb) => {
        const client = sessions.get(socket.id);
        if(!client) return cb([]);
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

    socket.on('disconnect', () => {
        destroySession(socket.id);
    });
});

server.listen(8000, () => console.log('Backend Online: 8000'));