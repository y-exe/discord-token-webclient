const API_SERVER_URL = "https://api.yexe.xyz";
const socket = io(API_SERVER_URL);

const clientPage = document.getElementById('client-page');
const invalidPage = document.getElementById('session-invalid-page');

const clientContainer = document.getElementById('full-client-container');
const guildList = document.getElementById('guild-list');
const guildNameText = document.getElementById('guild-name-text');
const channelList = document.getElementById('channel-list');
const messageList = document.getElementById('message-list');
const channelNameText = document.getElementById('channel-name-text');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const guildContextMenu = document.getElementById('guild-context-menu');
const messageContextMenu = document.getElementById('message-context-menu');
const backToChannelsButton = document.getElementById('back-to-channels');
const replyIndicator = document.getElementById('reply-indicator');
const replyToUser = document.getElementById('reply-to-user');
const cancelReplyButton = document.getElementById('cancel-reply-button');
const mentionToggleButton = document.getElementById('mention-toggle-button');
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeUserMessage = document.getElementById('welcome-user-message');

let currentSessionId = null;
let currentGuildId = null;
let currentChannelId = null;
let lastMessageAuthorId = null;
let currentUser = null;
let replyingToMessage = null;
let longPressTimer;
let isMentionEnabled = false;

function applyTheme(theme) { document.body.dataset.theme = theme; localStorage.setItem('discord-theme', theme); document.querySelectorAll('.theme-btn.active').forEach(b => b.classList.remove('active')); const currentThemeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`); if(currentThemeBtn) currentThemeBtn.classList.add('active'); }

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('discord-theme') || 'dark';
    applyTheme(savedTheme);

    socket.on('connect', () => {
        const redirectPath = sessionStorage.getItem('redirectPath');
        sessionStorage.removeItem('redirectPath');

        let path = redirectPath || (window.location.hash ? window.location.hash.substring(1) : window.location.pathname);
        
        if (window.location.pathname.endsWith('/demo.html')) {
            path = 'client/demo';
        }

        if (redirectPath && redirectPath !== window.location.pathname) {
            window.history.replaceState(null, '', redirectPath);
        } else if (window.location.hash && ('/' + path) !== window.location.pathname) {
             window.history.replaceState(null, '', '/' + path);
        }
        
        const pathParts = path.split('/').filter(p => p);
        
        if (pathParts[0] === 'client' && pathParts.length > 1) {
            currentSessionId = pathParts[1];
            const initialGuildId = pathParts[2];
            const initialChannelId = pathParts[3];

            if (currentSessionId) {
                socket.emit('authenticate', currentSessionId, (response) => {
                    if (response.success) {
                        if (invalidPage) invalidPage.style.display = 'none';
                        if (clientPage) clientPage.style.display = 'block';
                        document.body.classList.remove('theme-alt');
                        currentUser = response.user;
                        loadClientData(initialGuildId, initialChannelId);
                    } else {
                        if (clientPage) clientPage.style.display = 'none';
                        if (invalidPage) invalidPage.style.display = 'flex';
                        initializeInvalidPage();
                    }
                });
            }
        } else {
            if (clientPage) clientPage.style.display = 'none';
            if (invalidPage) {
                invalidPage.style.display = 'flex';
                initializeInvalidPage();
            } else {
                 document.body.innerHTML = `<h1>無効なページです</h1><p>正しいURLからアクセスしてください。</p>`;
            }
        }
    });

    if(backToChannelsButton) backToChannelsButton.addEventListener('click', () => clientContainer.classList.remove('show-messages'));
    if(cancelReplyButton) cancelReplyButton.addEventListener('click', cancelReply);
    if(mentionToggleButton) mentionToggleButton.addEventListener('click', () => { isMentionEnabled = !isMentionEnabled; mentionToggleButton.classList.toggle('active', isMentionEnabled); });
    if(welcomeScreen) {
        const themeButtons = welcomeScreen.querySelector('.theme-buttons');
        if (themeButtons) {
            themeButtons.addEventListener('click', (e) => { 
                if (e.target.classList.contains('theme-btn')) applyTheme(e.target.dataset.theme); 
            });
        }
    }
    
    if(chatForm) {
        chatForm.addEventListener('submit', (e) => { e.preventDefault(); const content = messageInput.value.trim(); if (content && currentChannelId) { socket.emit('sendMessage', { channelId: currentChannelId, content, reply: replyingToMessage ? { messageId: replyingToMessage.id, mention: isMentionEnabled } : null }); messageInput.value = ''; cancelReply(); } });
    }

    if (guildContextMenu && messageContextMenu) {
        document.addEventListener('click', (e) => { 
            if (!e.target.closest('.context-menu')) { 
                guildContextMenu.style.display = 'none'; 
                messageContextMenu.style.display = 'none'; 
            } 
        });
        guildContextMenu.addEventListener('click', (e) => { 
            const action = e.target.dataset.action; 
            const guildId = guildContextMenu.dataset.targetGuildId; 
            if (action === 'move-top' && guildId) { 
                const item = document.querySelector(`.guild-icon[data-guild-id='${guildId}']`).closest('.guild-item'); 
                const dmIcon = guildList.querySelector(`[data-guild-id='@me']`).closest('.guild-item'); 
                dmIcon.insertAdjacentElement('afterend', item); 
                const newOrder = [...guildList.children].map(i => i.querySelector('.guild-icon').dataset.guildId).filter(id => id !== '@me'); 
                localStorage.setItem('guildOrder', JSON.stringify(newOrder)); 
            } 
            guildContextMenu.style.display = 'none'; 
        });
        messageContextMenu.addEventListener('click', (e) => { 
            const action = e.target.dataset.action; 
            const msgId = messageContextMenu.dataset.messageId; 
            const authorName = messageContextMenu.dataset.authorUsername; 
            if (action === 'reply') { 
                replyingToMessage = { id: msgId, username: authorName }; 
                replyToUser.textContent = `@${authorName}`; 
                replyIndicator.style.display = 'flex'; 
                messageInput.focus(); 
            } else if (action === 'delete') { 
                if (confirm('このメッセージを削除しますか？')) socket.emit('deleteMessage', { channelId: currentChannelId, messageId: msgId }, (res) => { if (!res.success) alert('削除失敗'); }); 
            } 
            messageContextMenu.style.display = 'none'; 
        });
    }
});

function initializeInvalidPage() {
    document.body.classList.add('theme-alt');
    const tokenInput = document.getElementById('token-input-invalid');
    const loginButton = document.getElementById('login-button-invalid');
    const loginHistoryContainer = document.getElementById('login-history-invalid');

    function renderHistoryForInvalid() {
        const history = JSON.parse(localStorage.getItem('discord-client-history') || '[]');
        loginHistoryContainer.innerHTML = '';
        if (history.length === 0) {
            loginHistoryContainer.innerHTML = '<p class="no-history">過去のログイン履歴はありません。</p>';
        } else {
            history.forEach(acc => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.dataset.token = acc.token;
                item.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(acc.avatar)}" alt="${acc.username}"><span>${acc.username}</span>`;
                loginHistoryContainer.appendChild(item);
            });
        }
    }

    renderHistoryForInvalid();
    
    const attemptLoginInvalid = (token) => {
        if (token) {
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            socket.emit('login', { token: token, isPreview: false });
        }
    };

    loginButton.addEventListener('click', () => attemptLoginInvalid(tokenInput.value.trim()));
    loginHistoryContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if (item && item.dataset.token) {
            loginHistoryContainer.innerHTML = '<div class="loader"></div>';
            attemptLoginInvalid(item.dataset.token);
        }
    });
    
    const onLoginSuccess = ({ sessionId }) => {
        window.location.hash = `client/${sessionId}`;
        window.location.reload();
    };
    
    const onLoginError = (msg) => {
        alert(`ログイン失敗: ${msg}`);
        loginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i>';
    };

    socket.off('login-success').on('login-success', onLoginSuccess);
    socket.off('login-error').on('login-error', onLoginError);
}

function loadClientData(initialGuildId, initialChannelId) { loadGuilds(initialGuildId, initialChannelId); }

function loadGuilds(initialGuildId, initialChannelId) {
    socket.emit('getGuilds', (guilds) => {
        guildList.innerHTML = '';
        if (currentSessionId !== 'demo') {
            guildList.appendChild(createGuildIcon({ id: '@me', name: 'ダイレクトメッセージ', icon: null }, true));
        }
        
        if (currentSessionId !== 'demo') {
            const savedOrder = JSON.parse(localStorage.getItem('guildOrder'));
            if (savedOrder) { guilds.sort((a, b) => { const iA = savedOrder.indexOf(a.id), iB = savedOrder.indexOf(b.id); if (iA === -1) return 1; if (iB === -1) return -1; return iA - iB; }); }
        }
        
        guilds.forEach(guild => guildList.appendChild(createGuildIcon(guild, false)));
        
        if (currentSessionId !== 'demo' && guildList) {
            new Sortable(guildList, { animation: 150, delay: 200, delayOnTouchOnly: true, onEnd: () => { const newOrder = [...guildList.children].map(item => item.querySelector('.guild-icon').dataset.guildId).filter(id => id !== '@me'); localStorage.setItem('guildOrder', JSON.stringify(newOrder)); } });
        }
        
        let targetGuildId = initialGuildId;
        if (!targetGuildId) {
            targetGuildId = (currentSessionId === 'demo') ? guilds[0]?.id : '@me';
        }

        const guildData = guilds.find(g => g.id === targetGuildId) || { id: targetGuildId, name: 'ダイレクトメッセージ' };
        selectGuild(targetGuildId, guildData.name, initialChannelId);
    });
}

function selectGuild(guildId, name, initialChannelId = null) {
    if (currentGuildId === guildId && initialChannelId === null) return;
    currentGuildId = guildId; currentChannelId = null;
    document.querySelectorAll('.guild-icon.active').forEach(el => el.classList.remove('active'));
    const guildIconEl = document.querySelector(`[data-guild-id='${guildId}']`);
    if(guildIconEl) guildIconEl.classList.add('active');
    guildNameText.textContent = name; channelNameText.textContent = 'チャンネルを選択';
    messageList.innerHTML = ''; 
    
    if (currentSessionId === 'demo') {
        messageInput.placeholder = "デモモードではメッセージを送信できません";
        messageInput.disabled = true;
    } else {
        messageInput.disabled = true;
    }
    
    channelList.innerHTML = '';
    clientContainer.classList.remove('show-messages');
    messageList.style.display = 'none';
    
    if(welcomeScreen){
        if ( (guildId === '@me' || !guildId) && currentSessionId !== 'demo') {
             welcomeScreen.style.display = 'flex';
             if (welcomeUserMessage) welcomeUserMessage.textContent = `ようこそ、${currentUser.username} さん！`;
        } else if (currentSessionId !== 'demo') {
            welcomeScreen.style.display = 'none';
        }
    }
    
    updateURL();

    if (guildId === '@me' && currentSessionId !== 'demo') { 
        loadDms(initialChannelId);
    } else { 
        loadChannels(guildId, initialChannelId); 
    }
}

function loadChannels(guildId, initialChannelId = null) {
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getChannels', guildId, (categories) => {
        channelList.innerHTML = '';
        categories.forEach(cat => {
            if (cat.name) { const catEl = document.createElement('div'); catEl.className = 'channel-category'; catEl.textContent = cat.name; channelList.appendChild(catEl); }
            cat.channels.forEach(ch => { const el = document.createElement('li'); el.className = 'channel-item'; el.innerHTML = `<span class="channel-prefix">#</span> ${ch.name}`; el.dataset.channelId = ch.id; el.addEventListener('click', () => selectChannel(ch.id, ch.name)); channelList.appendChild(el); });
        });
        if (initialChannelId) { const channel = categories.flatMap(c => c.channels).find(ch => ch.id === initialChannelId); if (channel) selectChannel(channel.id, channel.name); }
    });
}

function loadDms(initialChannelId = null) {
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getDms', (dms) => {
        channelList.innerHTML = '';
        const catEl = document.createElement('div'); catEl.className = 'channel-category'; catEl.textContent = 'ダイレクトメッセージ'; channelList.appendChild(catEl);
        dms.forEach(dm => { const el = document.createElement('li'); el.className = 'channel-item dm-item'; el.dataset.channelId = dm.id; el.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(dm.avatar)}" class="dm-avatar" alt=""> ${dm.name}`; el.addEventListener('click', () => selectChannel(dm.id, dm.name)); channelList.appendChild(el); });
        if (initialChannelId) { const dm = dms.find(d => d.id === initialChannelId); if (dm) selectChannel(dm.id, dm.name); }
    });
}

function selectChannel(channelId, name) {
    if (currentChannelId === channelId) { clientContainer.classList.add('show-messages'); return; }
    currentChannelId = channelId;
    document.querySelectorAll('.channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-channel-id='${channelId}']`).classList.add('active');
    if(welcomeScreen) welcomeScreen.style.display = 'none';
    messageList.style.display = 'block';
    const prefix = currentGuildId === '@me' ? '@' : '# ';
    channelNameText.textContent = `${prefix}${name}`;
    messageList.innerHTML = '<div class="welcome-message">メッセージを読み込み中...</div>';
    
    if (currentSessionId === 'demo') {
        messageInput.placeholder = "デモモードではメッセージを送信できません";
        messageInput.disabled = true;
    } else {
        messageInput.disabled = false;
        messageInput.placeholder = `${prefix}${name} へのメッセージ`;
    }
    
    clientContainer.classList.add('show-messages');
    updateURL();
    loadMessages();
}

function loadMessages() { socket.emit('getMessages', currentChannelId, (messages) => { messageList.innerHTML = ''; lastMessageAuthorId = null; messages.forEach(renderMessage); messageList.scrollTop = messageList.scrollHeight; }); }

function createGuildIcon(guild, isDM = false) { 
    const el = document.createElement('div'); el.className = 'guild-item'; 
    const icon = document.createElement('div'); icon.className = 'guild-icon'; 
    icon.dataset.guildId = guild.id; icon.title = guild.name; 
    if (isDM) { icon.innerHTML = `<i class="fa-brands fa-discord"></i>`; } 
    else if (guild.icon) { icon.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(guild.icon)}" alt="${guild.name}">`; } 
    else { icon.textContent = guild.name.substring(0, 1); } 
    icon.addEventListener('click', () => selectGuild(guild.id, guild.name)); 
    el.appendChild(icon); 
    if (guildContextMenu && currentSessionId !== 'demo') {
        el.addEventListener('contextmenu', e => showGuildContextMenu(e, guild.id)); 
        el.addEventListener('touchstart', e => { longPressTimer = setTimeout(() => { longPressTimer = null; showGuildContextMenu(e, guild.id); }, 500); }); 
        el.addEventListener('touchend', () => clearTimeout(longPressTimer)); 
        el.addEventListener('touchmove', () => clearTimeout(longPressTimer)); 
    }
    return el; 
}

function renderMessage(msg) {
    const isScrolledToBottom = messageList.scrollHeight - messageList.clientHeight <= messageList.scrollTop + 50;
    const el = document.createElement('div'); el.className = 'message'; el.dataset.messageId = msg.id; el.dataset.authorId = msg.author.id; el.dataset.authorUsername = msg.author.username;
    const contentHtml = parseDiscordContent(msg.content);
    let attachmentsHtml = msg.attachments?.map(att => { const urlWithoutQuery = att.url.split('?')[0]; if (/\.(jpeg|jpg|gif|png|webp)$/i.test(urlWithoutQuery)) { return `<div class="message-attachment"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(att.url)}" alt="添付画像"></div>`; } return ''; }).join('') || '';
    let embedsHtml = msg.embeds?.map(embed => { const borderColor = embed.color ? `style="border-color: ${embed.color}"` : ''; const authorHtml = embed.author ? `<div class="embed-author">${embed.author.iconURL ? `<img class="embed-author-icon" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.author.iconURL)}">` : ''}${embed.author.url ? `<a href="${embed.author.url}" target="_blank" rel="noopener noreferrer">${embed.author.name}</a>` : `<span>${embed.author.name}</span>`}</div>` : ''; const titleHtml = embed.title ? `<div class="embed-title">${embed.url ? `<a href="${embed.url}" target="_blank" rel="noopener noreferrer">${embed.title}</a>` : embed.title}</div>` : ''; const descHtml = embed.description ? `<div class="embed-description">${parseDiscordContent(embed.description)}</div>` : ''; const fieldsHtml = embed.fields ? `<div class="embed-fields">${embed.fields.map(field => `<div class="embed-field ${field.inline ? 'inline' : ''}"><div class="embed-field-name">${field.name}</div><div>${parseDiscordContent(field.value)}</div></div>`).join('')}</div>` : ''; const imageHtml = embed.image ? `<div class="embed-image"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.image.url)}"></div>` : ''; const thumbnailHtml = embed.thumbnail ? `<div class="embed-thumbnail"><img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.thumbnail.url)}"></div>` : ''; const footerHtml = embed.footer ? `<div class="embed-footer">${embed.footer.iconURL ? `<img class="embed-footer-icon" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(embed.footer.iconURL)}">` : ''}<span>${embed.footer.text}</span></div>` : ''; return `<div class="embed-wrapper" ${borderColor}><div class="embed-grid"><div class="embed-main">${authorHtml}${titleHtml}${descHtml}${fieldsHtml}${imageHtml}</div>${thumbnailHtml}</div>${footerHtml}</div>`; }).join('') || '';
    const displayName = msg.author.displayName === msg.author.username || !msg.author.displayName ? msg.author.username : `${msg.author.displayName} (${msg.author.username})`;
    const botTag = msg.author.bot ? '<span class="author-bot-tag">BOT</span>' : '';
    let replyHtml = '';
    if (msg.replyTo) { replyHtml = `<div class="reply-header"><img class="reply-avatar" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(msg.replyTo.author.avatar)}" alt=""><span class="reply-author">${msg.replyTo.author.displayName}</span><span class="reply-content">${parseDiscordContent(msg.replyTo.content) || '...'}</span></div>`; }
    if (lastMessageAuthorId !== msg.author.id) {
        el.classList.add('new-author');
        const timestamp = formatTimestamp(new Date(msg.timestamp));
        el.innerHTML = `<img class="message-avatar" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(msg.author.avatar)}" alt=""><div class="message-body">${replyHtml}<div class="author-line"><span class="author">${displayName}${botTag}</span><span class="timestamp">${timestamp}</span></div><div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    } else {
        el.innerHTML = `<div class="message-body same-author">${replyHtml}<div class="content">${contentHtml}${attachmentsHtml}${embedsHtml}</div></div>`;
    }
    messageList.appendChild(el);
    lastMessageAuthorId = msg.author.id;
    if (messageContextMenu && currentSessionId !== 'demo') {
        el.addEventListener('contextmenu', showMessageContextMenu);
        el.addEventListener('touchstart', (e) => { longPressTimer = setTimeout(() => { longPressTimer = null; showMessageContextMenu(e); }, 500); });
        el.addEventListener('touchend', () => clearTimeout(longPressTimer));
        el.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    }
    if (isScrolledToBottom) messageList.scrollTop = messageList.scrollHeight;
}

function parseDiscordContent(content) { if (!content) return ''; let pText = content; pText = pText.replace(/<a?:(\w+?):(\d+?)>/g, (match, name, id) => `<img class="emoji" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(`https://cdn.discordapp.com/emojis/${id}.${match.startsWith('<a:') ? 'gif' : 'webp'}?size=48`)}" alt=":${name}:">`); pText = pText.replace(/@\[\[(USER|ROLE):(.+?)\]\]/g, (m, t, n) => `<span class="mention">@${n}</span>`); let html = marked.parse(pText, { breaks: true, gfm: true }).trim().replace(/^<p>|<\/p>$/g, ''); return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); }

function formatTimestamp(date) { const now = new Date(), yday = new Date(now); yday.setDate(yday.getDate() - 1); const pad = (n) => n.toString().padStart(2, '0'); const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`; if (date.toDateString() === now.toDateString()) return time; if (date.toDateString() === yday.toDateString()) return `昨日 ${time}`; return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`; }

function updateURL() { 
    if (currentSessionId === 'demo') return;
    let url = `/client/${currentSessionId}`; 
    if (currentGuildId) { url += `/${currentGuildId}`; if (currentChannelId) { url += `/${currentChannelId}`; } } 
    window.history.pushState({ guildId: currentGuildId, channelId: currentChannelId }, '', url); 
}

function cancelReply() { replyingToMessage = null; replyIndicator.style.display = 'none'; isMentionEnabled = false; mentionToggleButton.classList.remove('active'); }

function showGuildContextMenu(e, guildId) { e.preventDefault(); if (!guildContextMenu) return; guildContextMenu.style.display = 'block'; const touch = e.touches ? e.touches[0] : e; guildContextMenu.style.left = `${touch.pageX}px`; guildContextMenu.style.top = `${touch.pageY}px`; guildContextMenu.dataset.targetGuildId = guildId; }

function showMessageContextMenu(e) { e.preventDefault(); if (!messageContextMenu) return; const msgEl = e.target.closest('.message'); if (!msgEl) return; messageContextMenu.querySelector('[data-action="delete"]').style.display = (msgEl.dataset.authorId === currentUser.id) ? 'block' : 'none'; messageContextMenu.style.display = 'block'; const touch = e.touches ? e.touches[0] : e; messageContextMenu.style.left = `${touch.pageX}px`; messageContextMenu.style.top = `${touch.pageY}px`; messageContextMenu.dataset.messageId = msgEl.dataset.messageId; messageContextMenu.dataset.authorUsername = msgEl.dataset.authorUsername; }

socket.on('newMessage', (msg) => { if (msg.channelId === currentChannelId) { if (!document.querySelector(`.message[data-message-id='${msg.id}']`)) renderMessage(msg); } });

socket.on('messageDeleted', ({ channelId, messageId }) => { if (channelId === currentChannelId) { const msgEl = document.querySelector(`.message[data-message-id='${messageId}']`); if (msgEl) msgEl.remove(); } });
