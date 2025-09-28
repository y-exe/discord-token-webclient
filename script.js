const API_SERVER_URL = "https://api.yexe.xyz";
const socket = io(API_SERVER_URL);

let currentSessionId = null; let currentGuildId = null; let currentChannelId = null; let lastMessageAuthorId = null; let currentUser = null; let pendingToken = null; let replyingToMessage = null; let longPressTimer; let isMentionEnabled = false;

document.addEventListener('DOMContentLoaded', initializeSite);

function initializeSite() {
    const mainPage = document.getElementById('main-page');
    const clientPreviewWrapper = document.getElementById('client-preview-wrapper');
    const tokenInput = document.getElementById('token-input');
    const loginButton = document.getElementById('login-button');
    const loginHistoryContainer = document.getElementById('login-history');
    const previewUserAvatar = document.getElementById('preview-user-avatar');
    const previewUserName = document.getElementById('preview-user-name');
    const newTabButton = document.getElementById('new-tab-button');
    const shareButton = document.getElementById('share-button');
    const invalidateUrlInput = document.getElementById('invalidate-url-input');
    const invalidateLinkButton = document.getElementById('invalidate-link-button');

    const embeddedClient = document.getElementById('embedded-client');
    if (!embeddedClient) {
        console.error("Critical error: #embedded-client element not found.");
        return;
    }
    const guildList = embeddedClient.querySelector('#guild-list');
    const guildNameContainer = embeddedClient.querySelector('#guild-name-container');
    const channelList = embeddedClient.querySelector('#channel-list');
    const messageList = embeddedClient.querySelector('#message-list');
    const channelHeader = embeddedClient.querySelector('#channel-header');
    const channelNameText = embeddedClient.querySelector('#channel-name-text');
    const chatForm = embeddedClient.querySelector('#chat-form');
    const messageInput = embeddedClient.querySelector('#message-input');
    const replyIndicator = embeddedClient.querySelector('#reply-indicator');
    const replyToUser = embeddedClient.querySelector('#reply-to-user');
    const cancelReplyButton = embeddedClient.querySelector('#cancel-reply-button');
    const mentionToggleButton = embeddedClient.querySelector('#mention-toggle-button');
    const backToChannelsButton = embeddedClient.querySelector('#back-to-channels');

    const lenis = new Lenis({
        gestureOrientation: 'vertical',
        wheelEventsTarget: window,
        content: document.body,
    });
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    function setupSplitText() {
        document.querySelectorAll('[data-split-text]').forEach(el => {
            if (el.classList.contains('is-ready')) return;
            el.innerHTML = el.textContent.split('').map((char, i) => {
                const style = `--char-delay: ${i * 30}ms`;
                return `<span class="char" style="${style}">${char === ' ' ? '&nbsp;' : char}</span>`;
            }).join('');
            el.classList.add('is-ready');
        });
    }
    setupSplitText();
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { rootMargin: "0px 0px -10% 0px" });

    document.querySelectorAll('[data-reveal], [data-split-text]').forEach(el => {
        revealObserver.observe(el);
    });

    const scrollTrigger = document.getElementById('scroll-trigger');
    if (scrollTrigger) {
        const themeObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const isPastTrigger = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
                document.body.classList.toggle('theme-alt', isPastTrigger);
            });
        }, { root: null, threshold: 0 });
        themeObserver.observe(scrollTrigger);
    }

    const savedTheme = localStorage.getItem('discord-theme') || 'dark';
    applyTheme(savedTheme);
    
    socket.on('connect', () => handlePageLoad(loginHistoryContainer));
    if (socket.connected) handlePageLoad(loginHistoryContainer);

    document.querySelector('.theme-buttons')?.addEventListener('click', (e) => { 
        if (e.target.classList.contains('theme-btn')) applyTheme(e.target.dataset.theme); 
    });

    loginHistoryContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-history-btn');
        if (deleteButton) {
            e.stopPropagation();
            const item = deleteButton.closest('.history-item');
            if (item) {
                const userIdToDelete = item.dataset.userid;
                let history = JSON.parse(localStorage.getItem('discord-client-history') || '[]');
                history = history.filter(acc => acc.id !== userIdToDelete);
                localStorage.setItem('discord-client-history', JSON.stringify(history));
                renderLoginHistory(loginHistoryContainer);
            }
        } else {
            const item = e.target.closest('.history-item');
            if (item) attemptLogin(item.dataset.token, loginButton);
        }
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            lenis.scrollTo(targetId, {
                duration: 1.5,
                easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
            });
        });
    });

    const termsModal = document.getElementById('terms-modal');
    const termsAgreeButton = document.getElementById('terms-agree-button');
    if (termsAgreeButton && termsModal) {
        termsAgreeButton.addEventListener('click', () => { 
            termsModal.classList.remove('visible');
            if (pendingToken) { 
                loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
                loginButton.disabled = true; 
                socket.emit('login', pendingToken); 
                pendingToken = null; 
            } 
        });
    }

    const shareModal = document.getElementById('share-modal');
    if (shareButton && shareModal) {
        const shareModalCloseButton = document.getElementById('share-modal-close-button');
        const shareSettingsForm = document.getElementById('share-settings-form');
        
        shareButton.addEventListener('click', () => { 
            if (!currentSessionId) return alert('まずログインしてください。'); 
            const listEl = document.getElementById('share-guild-list'); 
            listEl.innerHTML = '<div class="loader"></div>'; 
            socket.emit('getGuilds', (guilds) => { 
                listEl.innerHTML = ''; 
                guilds.forEach(g => { 
                    listEl.innerHTML += `<label class="checkbox-label"><input type="checkbox" name="guild" value="${g.id}"> <span>${g.name}</span></label>`; 
                }); 
            }); 
            shareModal.classList.add('visible'); 
        });

        if (shareModalCloseButton) {
            shareModalCloseButton.addEventListener('click', () => shareModal.classList.remove('visible'));
        }
        shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.remove('visible'); });

        if (shareSettingsForm) {
            shareSettingsForm.addEventListener('submit', (e) => { 
                e.preventDefault(); 
                const fData = new FormData(e.target); 
                const data = { permissions: { canSendMessage: fData.has('canSendMessage'), allowedGuilds: fData.getAll('guild'), expiry: fData.get('expiry') }, origin: window.location.origin }; 
                socket.emit('createShareLink', data, (res) => { 
                    if (res.success) { 
                        prompt('このリンクを共有してください:', res.url); 
                        shareModal.classList.remove('visible'); 
                    } else { 
                        alert("リンク作成失敗"); 
                    } 
                }); 
            });
        }
    }
    
    if (invalidateLinkButton) {
        invalidateLinkButton.addEventListener('click', () => { 
            const url = invalidateUrlInput.value.trim(); 
            if (!url) return; 
            socket.emit('invalidateShareLink', url, (res) => { 
                alert(res.message); 
                if (res.success) invalidateUrlInput.value = ''; 
            }); 
        });
    }

    loginButton.addEventListener('click', () => attemptLogin(tokenInput.value.trim(), loginButton));
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); const content = messageInput.value.trim(); if (content && currentChannelId) { socket.emit('sendMessage', { channelId: currentChannelId, content, reply: replyingToMessage ? { messageId: replyingToMessage.id, mention: isMentionEnabled } : null }); messageInput.value = ''; cancelReply(replyIndicator, mentionToggleButton); } });
    newTabButton.addEventListener('click', () => { 
        if (currentSessionId) { 
            const gPath = currentGuildId ? `/${currentGuildId}` : ''; 
            const cPath = currentChannelId ? `/${currentChannelId}` : '';
            window.open(`client.html#client/${currentSessionId}${gPath}${cPath}`, '_blank');
        } 
    });
    
    cancelReplyButton.addEventListener('click', () => cancelReply(replyIndicator, mentionToggleButton));
    mentionToggleButton.addEventListener('click', () => { isMentionEnabled = !isMentionEnabled; mentionToggleButton.classList.toggle('active', isMentionEnabled); });
    backToChannelsButton.addEventListener('click', () => embeddedClient.classList.remove('show-messages'));
}

function handlePageLoad(loginHistoryContainer) {
    document.getElementById('main-page').style.display = 'block';
    renderLoginHistory(loginHistoryContainer);
}

function applyTheme(theme) { document.body.dataset.theme = theme; localStorage.setItem('discord-theme', theme); document.querySelectorAll('.theme-btn.active').forEach(b => b.classList.remove('active')); const currentThemeBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`); if(currentThemeBtn) currentThemeBtn.classList.add('active'); }

function showEmbeddedClientPreview(user) {
    const previewUserAvatar = document.getElementById('preview-user-avatar');
    const previewUserName = document.getElementById('preview-user-name');
    const clientPreviewWrapper = document.getElementById('client-preview-wrapper');

    previewUserAvatar.src = `${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(user.avatar)}`;
    previewUserName.textContent = user.username;
    clientPreviewWrapper.style.display = 'block';
    setTimeout(() => clientPreviewWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    loadClientData();
}

function attemptLogin(token, loginButton) { 
    if (!token) return; 
    const history = JSON.parse(localStorage.getItem('discord-client-history') || '[]'); 
    const isFirstTime = !history.some(acc => acc.token === token); 
    const termsModal = document.getElementById('terms-modal');
    if (isFirstTime && termsModal) { 
        pendingToken = token; 
        termsModal.classList.add('visible'); 
    } else { 
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
        loginButton.disabled = true; 
        socket.emit('login', token); 
    } 
}

function loadClientData() { 
    const guildList = document.querySelector('#embedded-client #guild-list');
    loadGuilds(guildList); 
}

function renderLoginHistory(loginHistoryContainer) {
    const history = JSON.parse(localStorage.getItem('discord-client-history') || '[]');
    loginHistoryContainer.innerHTML = '';
    if (history.length === 0) {
        loginHistoryContainer.innerHTML = '<p class="no-history">過去のログイン履歴はありません。</p>';
    } else {
        history.forEach(acc => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.dataset.token = acc.token;
            item.dataset.userid = acc.id;
            item.innerHTML = `
                <img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(acc.avatar)}" alt="${acc.username}">
                <span>${acc.username}</span>
                <button class="delete-history-btn" title="このログを削除"><i class="fa-solid fa-xmark"></i></button>
            `;
            loginHistoryContainer.appendChild(item);
        });
    }
}

function loadGuilds(guildList) {
    socket.emit('getGuilds', (guilds) => {
        guildList.innerHTML = '';
        guildList.appendChild(createGuildIcon({ id: '@me', name: 'ダイレクトメッセージ', icon: null }, true));
        const savedOrder = JSON.parse(localStorage.getItem('guildOrder'));
        if (savedOrder) { guilds.sort((a, b) => { const iA = savedOrder.indexOf(a.id), iB = savedOrder.indexOf(b.id); if (iA === -1) return 1; if (iB === -1) return -1; return iA - iB; }); }
        guilds.forEach(guild => guildList.appendChild(createGuildIcon(guild, false)));
        new Sortable(guildList, { animation: 150, delay: 200, delayOnTouchOnly: true, onEnd: () => { const newOrder = [...guildList.children].map(item => item.querySelector('.guild-icon').dataset.guildId).filter(id => id !== '@me'); localStorage.setItem('guildOrder', JSON.stringify(newOrder)); } });
    });
}

function selectGuild(guildId, name) {
    if (currentGuildId === guildId) return;
    currentGuildId = guildId; currentChannelId = null;
    document.querySelectorAll('#embedded-client .guild-icon.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`#embedded-client [data-guild-id='${guildId}']`).classList.add('active');
    document.querySelector('#embedded-client #guild-name-container').textContent = name; 
    document.querySelector('#embedded-client #channel-name-text').textContent = 'チャンネルを選択';
    document.querySelector('#embedded-client #message-list').innerHTML = '<div class="welcome-message">サーバーとチャンネルを選択してください</div>';
    document.querySelector('#embedded-client #message-input').disabled = true; 
    document.querySelector('#embedded-client #channel-list').innerHTML = '';
    document.getElementById('embedded-client').classList.remove('show-messages');
    if (guildId === '@me') { loadDms(); } else { loadChannels(guildId); }
}

function loadChannels(guildId) {
    const channelList = document.querySelector('#embedded-client #channel-list');
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getChannels', guildId, (categories) => {
        channelList.innerHTML = '';
        categories.forEach(cat => {
            if (cat.name) { const catEl = document.createElement('div'); catEl.className = 'channel-category'; catEl.textContent = cat.name; channelList.appendChild(catEl); }
            cat.channels.forEach(ch => { const el = document.createElement('li'); el.className = 'channel-item'; el.innerHTML = `<span class="channel-prefix">#</span> ${ch.name}`; el.dataset.channelId = ch.id; el.addEventListener('click', () => selectChannel(ch.id, ch.name)); channelList.appendChild(el); });
        });
    });
}

function loadDms() {
    const channelList = document.querySelector('#embedded-client #channel-list');
    channelList.innerHTML = '<li>読み込み中...</li>';
    socket.emit('getDms', (dms) => {
        channelList.innerHTML = '';
        const catEl = document.createElement('div'); catEl.className = 'channel-category'; catEl.textContent = 'ダイレクトメッセージ'; channelList.appendChild(catEl);
        dms.forEach(dm => { const el = document.createElement('li'); el.className = 'channel-item dm-item'; el.dataset.channelId = dm.id; el.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(dm.avatar)}" class="dm-avatar" alt=""> ${dm.name}`; el.addEventListener('click', () => selectChannel(dm.id, dm.name)); channelList.appendChild(el); });
    });
}

function selectChannel(channelId, name) {
    const embeddedClient = document.getElementById('embedded-client');
    const messageList = embeddedClient.querySelector('#message-list');
    const messageInput = embeddedClient.querySelector('#message-input');
    const channelNameText = embeddedClient.querySelector('#channel-name-text');

    if (currentChannelId === channelId && embeddedClient.classList.contains('show-messages')) return;
    currentChannelId = channelId;
    document.querySelectorAll('#embedded-client .channel-item.active').forEach(el => el.classList.remove('active'));
    document.querySelector(`#embedded-client [data-channel-id='${channelId}']`).classList.add('active');
    const prefix = currentGuildId === '@me' ? '@' : '# ';
    channelNameText.textContent = `${prefix}${name}`;
    messageList.innerHTML = '<div class="welcome-message">メッセージを読み込み中...</div>';
    messageInput.disabled = false; messageInput.placeholder = `${prefix}${name} へのメッセージ`;
    embeddedClient.classList.add('show-messages');
    loadMessages(messageList);
}

function loadMessages(messageList) { socket.emit('getMessages', currentChannelId, (messages) => { messageList.innerHTML = ''; lastMessageAuthorId = null; messages.forEach(msg => renderMessage(msg, messageList)); messageList.scrollTop = messageList.scrollHeight; }); }

function createGuildIcon(guild, isDM = false) { 
    const el = document.createElement('div'); el.className = 'guild-item'; 
    const icon = document.createElement('div'); icon.className = 'guild-icon'; 
    icon.dataset.guildId = guild.id; icon.title = guild.name; 
    if (isDM) { icon.innerHTML = `<i class="fa-brands fa-discord"></i>`; } 
    else if (guild.icon) { icon.innerHTML = `<img src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(guild.icon)}" alt="${guild.name}">`; } 
    else { icon.textContent = guild.name.substring(0, 1); } 
    icon.addEventListener('click', () => selectGuild(guild.id, guild.name)); 
    el.appendChild(icon); 
    return el; 
}
function renderMessage(msg, messageList) {
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
    if (isScrolledToBottom) messageList.scrollTop = messageList.scrollHeight;
}
function parseDiscordContent(content) { if (!content) return ''; let pText = content; pText = pText.replace(/<a?:(\w+?):(\d+?)>/g, (match, name, id) => `<img class="emoji" src="${API_SERVER_URL}/api/image-proxy?url=${encodeURIComponent(`https://cdn.discordapp.com/emojis/${id}.${match.startsWith('<a:') ? 'gif' : 'webp'}?size=48`)}" alt=":${name}:">`); pText = pText.replace(/@\[\[(USER|ROLE):(.+?)\]\]/g, (m, t, n) => `<span class="mention">@${n}</span>`); let html = marked.parse(pText, { breaks: true, gfm: true }).trim().replace(/^<p>|<\/p>$/g, ''); return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); }
function formatTimestamp(date) { const now = new Date(), yday = new Date(now); yday.setDate(yday.getDate() - 1); const pad = (n) => n.toString().padStart(2, '0'); const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`; if (date.toDateString() === now.toDateString()) return time; if (date.toDateString() === yday.toDateString()) return `昨日 ${time}`; return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`; }
function cancelReply(replyIndicator, mentionToggleButton) { replyingToMessage = null; replyIndicator.style.display = 'none'; isMentionEnabled = false; mentionToggleButton.classList.remove('active'); }

socket.on('login-success', ({ sessionId, user }) => { const loginButton = document.getElementById('login-button'); const tokenInput = document.getElementById('token-input'); currentSessionId = sessionId; currentUser = user; const token = tokenInput.value.trim() || document.querySelector(`[data-userid='${user.id}']`)?.dataset.token; if (token) { let history = JSON.parse(localStorage.getItem('discord-client-history') || '[]'); history = history.filter(h => h.id !== user.id); history.unshift({ ...user, token }); localStorage.setItem('discord-client-history', JSON.stringify(history.slice(0, 5))); } tokenInput.value = ""; loginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i>'; loginButton.disabled = false; showEmbeddedClientPreview(user); renderLoginHistory(document.getElementById('login-history')); });
socket.on('login-error', (msg) => { const loginButton = document.getElementById('login-button'); alert(`ログイン失敗: ${msg}`); loginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i>'; loginButton.disabled = false; });
socket.on('newMessage', (msg) => { if (msg.channelId === currentChannelId) { const messageList = document.querySelector('#embedded-client #message-list'); if (!messageList.querySelector(`.message[data-message-id='${msg.id}']`)) renderMessage(msg, messageList); } });
socket.on('messageDeleted', ({ channelId, messageId }) => { if (channelId === currentChannelId) { const msgEl = document.querySelector(`#embedded-client .message[data-message-id='${messageId}']`); if (msgEl) msgEl.remove(); } });
socket.on('disconnect', () => console.log("サーバーから切断されました。"));
