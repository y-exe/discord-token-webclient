const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { SocksProxyAgent } = require('socks-proxy-agent');
const TorControl = require('tor-control');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8000;
const TOR_SOCKS_PORT = 9050;
const TOR_CONTROL_PORT = 9051;
const TOR_HOST = '127.0.0.1';
const LINKS_FILE_PATH = path.join(__dirname, 'sharedLinks.json');
const TOKENS_FILE_PATH = path.join(__dirname, 'tokens.json');

let sessions = new Map();
let sharedLinks = new Map();
let persistentTokens = new Map();

const torAgent = new SocksProxyAgent(`socks5h://${TOR_HOST}:${TOR_SOCKS_PORT}`);
const torControl = new TorControl({ host: TOR_HOST, port: TOR_CONTROL_PORT, password: '' });

function saveSharedLinks() { try { const linksToSave = Array.from(sharedLinks.entries()).filter(([_, link]) => { const expiry = parseInt(link.permissions.expiry, 10); return expiry === 0 || expiry >= 86400; }); fs.writeFileSync(LINKS_FILE_PATH, JSON.stringify(linksToSave, null, 2), 'utf-8'); console.log(`[Persistence] Saved ${linksToSave.length} long-term share links.`); } catch (err) { console.error('[Persistence] Failed to save share links:', err); } }
function loadSharedLinks() { try { if (fs.existsSync(LINKS_FILE_PATH)) { const linksArray = JSON.parse(fs.readFileSync(LINKS_FILE_PATH, 'utf-8')); const now = Date.now(); const validLinks = linksArray.filter(([_, link]) => link.expiresAt === null || link.expiresAt > now); sharedLinks = new Map(validLinks); console.log(`[Persistence] Loaded ${sharedLinks.size} valid share links from ${LINKS_FILE_PATH}.`); } } catch (err) { console.error('[Persistence] Failed to load share links:', err); } }
function saveTokens() { try { const tokensToSave = Array.from(persistentTokens.entries()); fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(tokensToSave, null, 2), 'utf-8'); console.log(`[Persistence] Saved ${tokensToSave.length} user tokens.`); } catch (err) { console.error('[Persistence] Failed to save tokens:', err); } }
function loadTokens() { try { if (fs.existsSync(TOKENS_FILE_PATH)) { const tokensArray = JSON.parse(fs.readFileSync(TOKENS_FILE_PATH, 'utf-8')); persistentTokens = new Map(tokensArray); console.log(`[Persistence] Loaded ${persistentTokens.size} user tokens from ${TOKENS_FILE_PATH}.`); } } catch (err) { console.error('[Persistence] Failed to load tokens:', err); } }
function renewTorCircuit() { setInterval(() => { torControl.signalNewnym((err, status) => { if (err) { return console.error('[Tor] Failed to renew circuit. Is Tor control port running and accessible?', err); } if (status.code === 250) { console.log('[Tor] Successfully renewed Tor circuit. IP address has changed.'); } else { console.error('[Tor] Renew circuit command was not successful.', status.message); } }); }, 30 * 60 * 1000); }

app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
const clientAuthHandler = (req, res) => { const session = sessions.get(req.params.sessionId); if (session) { res.sendFile(path.join(__dirname, 'public', 'client.html')); } else { res.status(403).send('<h1>403 Forbidden</h1><p>アクセスが許可されていません。セッションが見つかりません。</p>'); } };
app.get('/client/:sessionId', clientAuthHandler); app.get('/client/:sessionId/:guildId', clientAuthHandler); app.get('/client/:sessionId/:guildId/:channelId', clientAuthHandler);
const shareAuthHandler = (req, res) => { const link = sharedLinks.get(req.params.shareId); if (link && (link.expiresAt === null || link.expiresAt > Date.now())) { res.sendFile(path.join(__dirname, 'public', 'share.html')); } else { if (link) { sharedLinks.delete(req.params.shareId); saveSharedLinks(); } res.status(404).send('<h1>404 Not Found</h1><p>この共有リンクは無効か、期限切れです。</p>'); } };
app.get('/share/:shareId', shareAuthHandler); app.get('/share/:shareId/:guildId', shareAuthHandler); app.get('/share/:shareId/:guildId/:channelId', shareAuthHandler);
app.get('/api/image-proxy', async (req, res) => { const { url } = req.query; if (!url) return res.status(400).send('URL is required'); try { const response = await axios.get(url, { responseType: 'arraybuffer' }); res.set('Content-Type', response.headers['content-type']); res.send(response.data); } catch (error) { res.status(502).send('Failed to fetch image'); } });

function formatMessage(msg) {
    let replyTo = null;
    if (msg.reference && msg.channel.messages.cache.has(msg.reference.messageId)) {
        const repliedMsg = msg.channel.messages.cache.get(msg.reference.messageId);
        replyTo = {
            content: repliedMsg.content,
            author: {
                username: repliedMsg.author.username,
                displayName: repliedMsg.member ? repliedMsg.member.displayName : repliedMsg.author.username,
                avatar: repliedMsg.author.displayAvatarURL(),
            }
        };
    }
    
    const processedContent = msg.content
        .replace(/<@!?(\d+)>/g, (match, userId) => {
            const member = msg.guild?.members.cache.get(userId);
            return `@[[USER:${member ? member.displayName : '不明なユーザー'}]]`;
        })
        .replace(/<@&(\d+)>/g, (match, roleId) => {
            const role = msg.guild?.roles.cache.get(roleId);
            return `@[[ROLE:${role ? role.name : '不明なロール'}]]`;
        });

    return { 
        id: msg.id, 
        content: processedContent,
        author: { 
            id: msg.author.id, 
            username: msg.author.username, 
            displayName: msg.member ? msg.member.displayName : msg.author.username, 
            avatar: msg.author.displayAvatarURL(), 
            bot: msg.author.bot 
        }, 
        timestamp: msg.createdAt, 
        channelId: msg.channel.id, 
        attachments: msg.attachments.map(att => ({ url: att.url })), 
        embeds: msg.embeds.map(embed => ({ author: embed.author ? { name: embed.author.name, iconURL: embed.author.iconURL, url: embed.author.url } : null, title: embed.title, description: embed.description, url: embed.url, color: embed.hexColor, fields: embed.fields.map(field => ({ name: field.name, value: field.value, inline: field.inline })), image: embed.image ? { url: embed.image.url } : null, thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : null, footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconURL } : null, timestamp: embed.timestamp, })),
        replyTo 
    }; 
}

function getChannelsForGuild(guild, supportedTypes = ['GUILD_TEXT', 'GUILD_NEWS']) { const categories = guild.channels.cache.filter(c => c.type === 'GUILD_CATEGORY').sort((a, b) => a.position - b.position).map(cat => ({ id: cat.id, name: cat.name, channels: guild.channels.cache.filter(ch => supportedTypes.includes(ch.type) && ch.parentId === cat.id && ch.viewable).sort((a, b) => a.position - b.position).map(ch => ({ id: ch.id, name: ch.name, type: ch.type })) })); const channelsWithoutCategory = guild.channels.cache.filter(ch => supportedTypes.includes(ch.type) && !ch.parentId && ch.viewable).sort((a, b) => a.position - b.position).map(ch => ({ id: ch.id, name: ch.name, type: ch.type })); if (channelsWithoutCategory.length > 0) { categories.unshift({ id: null, name: "テキストチャンネル", channels: channelsWithoutCategory }); } return categories; }
async function getHostClientForShare(shareId) { const linkData = sharedLinks.get(shareId); if (!linkData) return null; const hostSession = sessions.get(linkData.hostSessionId); if (hostSession && hostSession.client?.readyAt) { return hostSession.client; } const token = persistentTokens.get(linkData.hostUserId); if (!token) { console.error(`[Share] Could not find a token for host user ${linkData.hostUserId}.`); return null; } console.log(`[Share] Host ${linkData.hostUserId} is offline. Creating new client for share ${shareId}.`); const tempClient = new Client({ checkUpdate: false, rest: { agent: torAgent }, ws: { agent: torAgent } }); try { await tempClient.login(token); const user = { id: tempClient.user.id, username: tempClient.user.username, avatar: tempClient.user.displayAvatarURL() }; sessions.set(linkData.hostSessionId, { ...sessions.get(linkData.hostSessionId), client: tempClient, user: user, token: token }); return tempClient; } catch (err) { console.error(`[Share] Failed to login with stored token for ${linkData.hostUserId}.`, err); return null; } }

io.on('connection', (socket) => {
    socket.on('login', async (token) => {
        if (!token) return socket.emit('login-error', 'Tokenがありません。');
        for (const [sid, session] of sessions.entries()) { if (session.token === token && session.client?.readyAt) { console.log(`[Login] Reconnecting user ${session.user.username} with session ${sid}`); socket.sessionId = sid; sessions.set(sid, { ...session, ip: socket.handshake.address, socketId: socket.id }); return socket.emit('login-success', { sessionId: sid, user: session.user }); } }
        try {
            const client = new Client({ checkUpdate: false, rest: { agent: torAgent }, ws: { agent: torAgent } });
            client.on('ready', async () => {
                const sessionId = uuidv4(); socket.sessionId = sessionId;
                const user = { id: client.user.id, username: client.user.username, discriminator: client.user.discriminator, avatar: client.user.displayAvatarURL() };
                persistentTokens.set(user.id, token); saveTokens();
                sessions.set(sessionId, { client, user, token, ip: socket.handshake.address, socketId: socket.id });
                socket.emit('login-success', { sessionId, user });
                client.on('messageCreate', (message) => { for(const s of sessions.values()){ if(s.user?.id === client.user.id && s.socketId) { io.to(s.socketId).emit('newMessage', formatMessage(message)); } } });
                client.on('messageDelete', (message) => { for (const s of sessions.values()) { if (s.user?.id === client.user.id && s.socketId) { io.to(s.socketId).emit('messageDeleted', { channelId: message.channel.id, messageId: message.id }); } } });
            });
            await client.login(token);
        } catch (err) { console.error(err); socket.emit('login-error', 'Tokenが正しくありません。'); }
    });

    socket.on('authenticate', (sessionId, callback) => { const session = sessions.get(sessionId); if (session) { socket.sessionId = sessionId; session.socketId = socket.id; callback({ success: true, user: session.user }); } else { callback({ success: false, message: 'セッションが見つかりません。' }); } });
    socket.on('createShareLink', (data, callback) => { const session = sessions.get(socket.sessionId); if (!session) return; const { permissions, origin } = data; const shareId = uuidv4(); const expirySeconds = parseInt(permissions.expiry, 10); const expiresAt = expirySeconds === 0 ? null : Date.now() + (expirySeconds * 1000); sharedLinks.set(shareId, { hostUserId: session.user.id, hostSessionId: socket.sessionId, permissions, expiresAt }); saveSharedLinks(); callback({ success: true, url: `${origin}/share/${shareId}` }); });
    socket.on('invalidateShareLink', (url, callback) => { const session = sessions.get(socket.sessionId); if (!session) return callback({ success: false, message: 'ログインしていません。'}); let shareId; try { shareId = new URL(url).pathname.split('/')[2]; } catch { return callback({ success: false, message: '無効なURL形式です。' }); } const linkData = sharedLinks.get(shareId); if (!linkData) return callback({ success: false, message: '存在しない共有リンクです。'}); if (linkData.hostUserId !== session.user.id) return callback({ success: false, message: 'このリンクを無効にする権限がありません。'}); sharedLinks.delete(shareId); saveSharedLinks(); callback({ success: true, message: '共有リンクを無効にしました。'}); });
    socket.on('joinShare', async (shareId, callback) => { const link = sharedLinks.get(shareId); if (!link || (link.expiresAt !== null && link.expiresAt <= Date.now())) { if(link) { sharedLinks.delete(shareId); saveSharedLinks(); } return callback({ success: false, message: "無効または期限切れのリンクです" }); }  const hostClient = await getHostClientForShare(shareId); if (!hostClient) { return callback({ success: false, message: "ホストに接続できませんでした" }); }  socket.shareId = shareId; let guilds = hostClient.guilds.cache; if (link.permissions.allowedGuilds && link.permissions.allowedGuilds.length > 0) { guilds = guilds.filter(g => link.permissions.allowedGuilds.includes(g.id)); } callback({ success: true, permissions: link.permissions, guilds: guilds.map(g => ({ id: g.id, name: g.name, icon: g.iconURL() })) }); });
    socket.on('getGuilds', (callback) => { const client = sessions.get(socket.sessionId)?.client; if (!client || !callback) return; const guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL() })); callback(guilds); });
    
    const createGetterById = (fetchFn) => async (id, callback) => { const client = socket.shareId ? await getHostClientForShare(socket.shareId) : sessions.get(socket.sessionId)?.client; if (!client || !id || !callback) return; try { await fetchFn(client, id, callback); } catch (err) { console.error(`Error in getter for socket ${socket.id} with id ${id}:`, err); } };
    
    socket.on('getChannels', createGetterById(async (client, guildId, callback) => { const guild = client.guilds.cache.get(guildId); if (guild) callback(getChannelsForGuild(guild)); }));
    
    socket.on('getMessages', createGetterById(async (client, channelId, callback) => {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 50 });
            callback(Array.from(messages.values()).map(formatMessage).reverse());
        }
    }));
    
    const getDmsForClient = (client) => { let dms = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM'); dms = dms.sort((a, b) => b.lastMessageId - a.lastMessageId); return dms.map(dm => { if (dm.type === 'DM') { const user = dm.recipient; return { id: dm.id, type: 'DM', name: user.username, avatar: user.displayAvatarURL() }; } else { return { id: dm.id, type: 'GROUP_DM', name: dm.name || dm.recipients.map(u => u.username).join(', '), avatar: dm.iconURL() }; } }); };
    
    socket.on('getDms', async (callback) => { const client = sessions.get(socket.sessionId)?.client; if (!client || !callback) return; callback(getDmsForClient(client)); });
    socket.on('getSharedDms', async (callback) => { const client = await getHostClientForShare(socket.shareId); if (!client || !callback) return; callback(getDmsForClient(client)); });
    
    socket.on('sendMessage', async (data) => {
        const client = sessions.get(socket.sessionId)?.client; if (!client) return;
        const { channelId, content, reply } = data; if (!channelId || !content) return;
        try { const channel = await client.channels.fetch(channelId); if (channel) { const options = { content }; if (reply) { options.reply = { messageReference: reply.messageId, failIfNotExists: false, }; options.allowedMentions = { repliedUser: reply.mention }; } await channel.send(options); } } catch (err) { console.error(err); }
    });
    socket.on('sendSharedMessage', async (data) => {
        const link = sharedLinks.get(socket.shareId); if (!link || !link.permissions.canSendMessage) return;
        const client = await getHostClientForShare(socket.shareId); if (!client) return;
        const { channelId, content, reply } = data; if (!channelId || !content) return;
        try { const channel = await client.channels.fetch(channelId); if (channel) { const options = { content }; if (reply) { options.reply = { messageReference: reply.messageId, failIfNotExists: false, }; options.allowedMentions = { repliedUser: reply.mention }; } await channel.send(options); } } catch (err) { console.error(err); }
    });
    socket.on('deleteMessage', async (data, callback) => { const client = sessions.get(socket.sessionId)?.client; if (!client) return callback({ success: false }); const { channelId, messageId } = data; if (!channelId || !messageId) return callback({ success: false }); try { const channel = await client.channels.fetch(channelId); const message = await channel.messages.fetch(messageId); if (message.author.id === client.user.id) { await message.delete(); callback({ success: true }); } else { callback({ success: false, message: "権限がありません。" }); } } catch (err) { console.error(err); callback({ success: false, message: "メッセージの削除に失敗しました。" }); } });
    
    socket.on('disconnect', () => { const session = Array.from(sessions.values()).find(s => s.socketId === socket.id); if (session) { const hasActiveShares = Array.from(sharedLinks.values()).some(link => link.hostUserId === session.user.id && (link.expiresAt === null || link.expiresAt > Date.now())); if (hasActiveShares) { console.log(`[Session] Host ${session.user.username} disconnected, but has active shares. Keeping session data.`); session.socketId = null; } else { setTimeout(() => { const disconnectedSession = Array.from(sessions.entries()).find(([_, s]) => s.user.id === session.user.id); if (disconnectedSession) { const [sid, sData] = disconnectedSession; if (!sData.socketId) { sData.client.destroy(); sessions.delete(sid); console.log(`[Session End] Session ${sid} for ${sData.user.username} destroyed.`); } } }, 30000); } } });
});

server.listen(PORT, () => { console.log(`サーバー起動: http://localhost:${PORT}`); loadTokens(); loadSharedLinks(); renewTorCircuit(); });
