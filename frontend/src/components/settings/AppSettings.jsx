import { useEffect, useMemo, useState } from 'react';
import {
  FaBell,
  FaChevronRight,
  FaCode,
  FaDisplay,
  FaEnvelope,
  FaFaceSmile,
  FaGlobe,
  FaKeyboard,
  FaLock,
  FaPalette,
  FaPenToSquare,
  FaRobot,
  FaShieldHalved,
  FaUser,
  FaVolumeHigh,
  FaXmark,
} from 'react-icons/fa6';

const categories = [
  {
    title: 'ユーザー設定',
    entries: [
      { id: 'profile', title: 'プロフィール', icon: <FaFaceSmile /> },
      { id: 'appearance', title: '外観', icon: <FaPalette /> },
      { id: 'notifications', title: '通知', icon: <FaBell /> },
      { id: 'voice', title: '音声・ビデオ', icon: <FaVolumeHigh /> },
      { id: 'language', title: '言語', icon: <FaGlobe /> },
      { id: 'keybinds', title: 'キーバインド', icon: <FaKeyboard /> },
      { id: 'privacy', title: 'プライバシー・安全', icon: <FaShieldHalved /> },
      { id: 'bots', title: 'Bot', icon: <FaRobot /> },
      { id: 'advanced', title: '詳細設定', icon: <FaCode /> },
    ],
  },
  {
    title: 'アプリ',
    entries: [
      { id: 'display', title: '表示', icon: <FaDisplay /> },
    ],
  },
];

const pageTitles = {
  account: 'マイアカウント',
  ...Object.fromEntries(categories.flatMap((cat) => cat.entries.map((entry) => [entry.id, entry.title]))),
};

const AppSettings = ({ user, onClose }) => {
  const [page, setPage] = useState('account');
  const [transitionKey, setTransitionKey] = useState(0);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const navigate = (id) => {
    setPage(id);
    setTransitionKey((value) => value + 1);
  };

  return (
    <div className="settings-root" role="dialog" aria-modal="true">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-scroll no-scrollbar">
          <SidebarButton
            selected={page === 'account'}
            onClick={() => navigate('account')}
          >
            <div className="settings-sidebar-avatar">
              {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.username?.[0] || 'U')}
            </div>
            <div className="settings-sidebar-button-content">
              <span className="settings-sidebar-button-title">{user?.username || '不明なユーザー'}</span>
              <span className="settings-sidebar-button-subtitle">マイアカウント</span>
            </div>
          </SidebarButton>

          {categories.map((category) => (
            <div key={category.title} className="settings-category-group">
              <span className="settings-category-title">{category.title}</span>
              <div className="settings-category-entries">
                {category.entries.map((entry) => (
                  <SidebarButton
                    key={entry.id}
                    selected={page === entry.id}
                    onClick={() => navigate(entry.id)}
                  >
                    <span className="settings-sidebar-icon">{entry.icon}</span>
                    <span className="settings-sidebar-button-title">{entry.title}</span>
                  </SidebarButton>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="settings-content no-scrollbar">
        <div className="settings-content-inner" key={transitionKey}>
          <h1 className="settings-page-title">{pageTitles[page]}</h1>
          <SettingsPage page={page} user={user} />
          <div className="settings-content-spacer" />
        </div>
        <div className="settings-close-area">
          <md-icon-button type="button" class="m3-icon-button" onClick={onClose} title="設定を閉じる">
            <FaXmark />
          </md-icon-button>
          <span className="settings-esc-label">ESC</span>
        </div>
      </main>
    </div>
  );
};

const SidebarButton = ({ selected, onClick, children }) => (
  <button
    type="button"
    className={`settings-sidebar-button ${selected ? 'selected' : ''}`}
    aria-selected={selected}
    onClick={onClick}
  >
    <md-ripple />
    {children}
  </button>
);

const SettingsPage = ({ page, user }) => {
  const [themeMode, setThemeMode] = useState('dark');
  const [blur, setBlur] = useState(true);
  const [sendButton, setSendButton] = useState(false);
  const [messageSize, setMessageSize] = useState(16);
  const [messageSpacing, setMessageSpacing] = useState(8);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [inputVolume, setInputVolume] = useState(72);
  const [outputVolume, setOutputVolume] = useState(85);
  const [developerMode, setDeveloperMode] = useState(false);

  const accountRows = useMemo(() => [
    ['ユーザー名', user?.username || '-'],
    ['ユーザーID', user?.id || '-'],
    ['セッション種別', 'Discordトークンセッション'],
  ], [user]);

  if (page === 'account') {
    return (
      <div className="settings-page">
        <UserSummary user={user} />
        <CategoryButtonGroup>
          <CategoryButton icon={<FaUser />} title="ユーザー名" description={user?.username || '-'} />
          <CategoryButton icon={<FaEnvelope />} title="メールアドレス" description="このクライアントでは取得できません" />
          <CategoryButton icon={<FaLock />} title="パスワード" description="Discord側で管理されています" />
          {accountRows.slice(1).map(([title, value]) => <CategoryButton key={title} icon={<FaShieldHalved />} title={title} description={value} />)}
        </CategoryButtonGroup>
        <div className="settings-actions">
          <md-filled-button type="button">プロフィールを編集</md-filled-button>
          <md-filled-tonal-button type="button">ユーザーIDをコピー</md-filled-tonal-button>
        </div>
      </div>
    );
  }

  if (page === 'profile') {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <h2 className="settings-card-title">プロフィールプレビュー</h2>
          <div className="settings-profile-preview">
            <div className="settings-profile-banner" />
            <div className="settings-profile-info">
              <div className="settings-profile-avatar-ring">
                <div className="settings-profile-avatar">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.username?.[0] || 'U')}
                </div>
              </div>
              <div>
                <div className="settings-profile-name">{user?.username || 'ユーザー'}</div>
                <div className="settings-profile-status">カスタムステータスは設定されていません。</div>
              </div>
            </div>
          </div>
          <TextField label="表示名" defaultValue={user?.username || ''} />
          <TextField label="自己紹介" defaultValue="トークンクライアントから使用中。" />
        </div>
      </div>
    );
  }

  if (page === 'appearance' || page === 'display') {
    return (
      <div className="settings-page">
        <AppearancePreview messageSize={messageSize} messageSpacing={messageSpacing} />
        <div className="settings-card">
          <h2 className="settings-card-title">カラー</h2>
          <Segmented value={themeMode} onChange={setThemeMode} options={['light', 'dark', 'system']} />
          <div className="settings-color-swatches">
            {['#f2f2f3', '#c7c7cb', '#9a9aa0', '#4a4a50', '#3a3a3f', '#2c2c30'].map((color) => (
              <button key={color} type="button" className="settings-color-swatch" style={{ background: color }} title={color}>
                <md-ripple />
              </button>
            ))}
          </div>
        </div>
        <CategoryButtonGroup>
          <SwitchRow title="透明ガラス/ぼかし効果を有効にする" description="Materialサーフェスに合わせます。" checked={blur} onChange={setBlur} />
          <SliderRow title="メッセージサイズ" value={messageSize} min={12} max={24} onChange={setMessageSize} suffix="px" />
          <SliderRow title="メッセージ間隔" value={messageSpacing} min={0} max={16} onChange={setMessageSpacing} suffix="px" />
          <SelectRow title="UIフォント" defaultValue="Inter" options={['Inter', 'gg sans', 'Google Sans']} />
        </CategoryButtonGroup>
        <CategoryButtonGroup>
          <SwitchRow title="送信ボタンを表示する" checked={sendButton} onChange={setSendButton} />
          <SelectRow title="絵文字パック" defaultValue="Twemoji" options={['Twemoji', 'Noto', 'Fluent Color']} />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'notifications') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <SwitchRow title="デスクトップ通知を有効にする" checked={desktopNotifs} onChange={setDesktopNotifs} />
          <SwitchRow title="メッセージ音を再生する" checked={soundNotifs} onChange={setSoundNotifs} />
          <SelectRow title="メンション通知" defaultValue="すべてのメンション" options={['すべてのメンション', '直接メンションのみ', '通知しない']} />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'voice') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <SelectRow title="入力デバイス" defaultValue="既定のマイク" options={['既定のマイク', '通信デバイス']} />
          <SelectRow title="出力デバイス" defaultValue="既定のスピーカー" options={['既定のスピーカー', 'ヘッドホン']} />
          <SliderRow title="入力音量" value={inputVolume} min={0} max={100} onChange={setInputVolume} suffix="%" />
          <SliderRow title="出力音量" value={outputVolume} min={0} max={100} onChange={setOutputVolume} suffix="%" />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'language') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <SelectRow title="表示言語" defaultValue="日本語" options={["日本語", "英語", "ドイツ語", "フランス語"]} />
          <SwitchRow title="24時間表記を使用する" checked onChange={() => {}} />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'keybinds') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <KeybindRow action="上のサーバーへ移動" keys="Alt + ArrowUp" />
          <KeybindRow action="下のサーバーへ移動" keys="Alt + ArrowDown" />
          <KeybindRow action="メッセージ入力欄にフォーカス" keys="Ctrl + K" />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'privacy') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <SwitchRow title="外部リンクを開く前に警告する" checked onChange={() => {}} />
          <SwitchRow title="露骨なメディアプレビューを非表示にする" checked={false} onChange={() => {}} />
          <SelectRow title="DMのメディアプレビュー" defaultValue="安全なプレビューを表示" options={['安全なプレビューを表示', 'すべて非表示']} />
        </CategoryButtonGroup>
      </div>
    );
  }

  if (page === 'advanced') {
    return (
      <div className="settings-page">
        <CategoryButtonGroup>
          <SwitchRow title="開発者モード" description="IDなど開発者向けの表示を有効にします。" checked={developerMode} onChange={setDeveloperMode} />
          <SwitchRow title="アニメーションを減らす" checked={false} onChange={() => {}} />
        </CategoryButtonGroup>
      </div>
    );
  }

  return (
    <div className="settings-card">
      <h2 className="settings-card-title">{pageTitles[page]}</h2>
      <p className="settings-card-description">
        このセクションはMaterial Designの設定レイアウトに合わせつつ、Discordトークンクライアントの動作は変更しません。
      </p>
      <CategoryButtonGroup>
        <CategoryButton title="状態" description="準備完了" action="none" />
      </CategoryButtonGroup>
    </div>
  );
};

const AppearancePreview = ({ messageSize, messageSpacing }) => (
  <div className="settings-preview" style={{ '--message-preview-size': `${messageSize}px`, '--message-preview-gap': `${messageSpacing}px` }}>
    <div className="settings-preview-messages">
      <div className="app-message !p-0">
        <div className="app-avatar !h-9 !w-9">S</div>
        <div className="min-w-0 flex-1 overflow-hidden pr-4">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold leading-6">プレビュー</span>
            <span className="text-sm font-medium text-[var(--app-outline)]">今日 12:00</span>
          </div>
          <div className="min-w-0 flex flex-col gap-1 text-base leading-[1.375rem]" style={{ fontSize: 'var(--message-preview-size)' }}>日本語の表示サイズを確認しています</div>
        </div>
      </div>
      <div className="app-message !p-0">
        <div className="app-avatar !h-9 !w-9">M</div>
        <div className="min-w-0 flex-1 overflow-hidden pr-4">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold leading-6">MysticPixie</span>
            <span className="text-sm font-medium text-[var(--app-outline)]">今日 12:01</span>
          </div>
          <div className="min-w-0 flex flex-col gap-1 text-base leading-[1.375rem]" style={{ fontSize: 'var(--message-preview-size)' }}><code>Material 3 Expressiveの雰囲気</code></div>
        </div>
      </div>
    </div>
  </div>
);

const UserSummary = ({ user }) => (
  <div className="settings-user-summary">
    <div className="settings-user-banner" />
    <div className="settings-user-info">
      <div className="settings-user-avatar-ring">
        <div className="settings-user-avatar">
          {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.username?.[0] || 'U')}
        </div>
      </div>
      <div className="settings-user-details">
        <div className="settings-user-name">{user?.username || '不明なユーザー'}</div>
        <div className="settings-user-status">オンライン</div>
      </div>
      <md-filled-tonal-button type="button">
        <FaPenToSquare slot="icon" />
        編集
      </md-filled-tonal-button>
    </div>
  </div>
);

const CategoryButtonGroup = ({ children }) => (
  <div className="settings-category-button-group">
    {children}
  </div>
);

const CategoryButton = ({ icon, title, description, trailing, onClick }) => (
  <button type="button" className="settings-category-button" onClick={onClick}>
    <md-ripple />
    {icon && <div className="settings-category-button-icon">{icon}</div>}
    <div className="settings-category-button-content">
      <span className="settings-category-button-title">{title}</span>
      {description && <span className="settings-category-button-description">{description}</span>}
    </div>
    <div className="settings-category-button-action">
      {trailing || <FaChevronRight size={16} />}
    </div>
  </button>
);

const segmentEdgeStyle = (index, total, active) => {
  const shape = index === 0
    ? {
        '--md-filled-button-container-shape-start-start': 'var(--app-radius-xl)',
        '--md-filled-button-container-shape-end-start': 'var(--app-radius-xl)',
        '--md-filled-button-container-shape-start-end': 'var(--app-radius-xs)',
        '--md-filled-button-container-shape-end-end': 'var(--app-radius-xs)',
        '--md-filled-tonal-button-container-shape-start-start': 'var(--app-radius-xl)',
        '--md-filled-tonal-button-container-shape-end-start': 'var(--app-radius-xl)',
        '--md-filled-tonal-button-container-shape-start-end': 'var(--app-radius-xs)',
        '--md-filled-tonal-button-container-shape-end-end': 'var(--app-radius-xs)',
      }
    : index === total - 1
      ? {
          '--md-filled-button-container-shape-start-start': 'var(--app-radius-xs)',
          '--md-filled-button-container-shape-end-start': 'var(--app-radius-xs)',
          '--md-filled-button-container-shape-start-end': 'var(--app-radius-xl)',
          '--md-filled-button-container-shape-end-end': 'var(--app-radius-xl)',
          '--md-filled-tonal-button-container-shape-start-start': 'var(--app-radius-xs)',
          '--md-filled-tonal-button-container-shape-end-start': 'var(--app-radius-xs)',
          '--md-filled-tonal-button-container-shape-start-end': 'var(--app-radius-xl)',
          '--md-filled-tonal-button-container-shape-end-end': 'var(--app-radius-xl)',
        }
      : {
          '--md-filled-button-container-shape': 'var(--app-radius-xs)',
          '--md-filled-tonal-button-container-shape': 'var(--app-radius-xs)',
        };

  return {
    ...shape,
    '--md-filled-button-container-color': 'var(--app-primary-container)',
    '--md-filled-button-label-text-color': 'var(--app-on-primary-container)',
    '--md-filled-tonal-button-container-color': active ? 'var(--app-primary-container)' : 'transparent',
    '--md-filled-tonal-button-label-text-color': active ? 'var(--app-on-primary-container)' : 'var(--app-on-surface)',
  };
};

const Segmented = ({ value, onChange, options }) => (
  <div className="settings-segmented">
    {options.map((option, index) => {
      const active = value === option;
      const MaterialButton = active ? 'md-filled-button' : 'md-filled-tonal-button';
      return (
        <MaterialButton key={option} type="button" style={segmentEdgeStyle(index, options.length, active)} onClick={() => onChange(option)}>
          {{ light: 'ライト', dark: 'ダーク', system: 'システム' }[option] || option}
        </MaterialButton>
      );
    })}
  </div>
);

const SwitchRow = ({ title, description, checked, onChange }) => {
  const [localChecked, setLocalChecked] = useState(Boolean(checked));

  useEffect(() => setLocalChecked(Boolean(checked)), [checked]);

  const toggle = () => {
    const next = !localChecked;
    setLocalChecked(next);
    onChange?.(next);
  };

  return (
    <div className="settings-category-button">
      <div className="settings-category-button-content">
        <span className="settings-category-button-title">{title}</span>
        {description && <span className="settings-category-button-description">{description}</span>}
      </div>
      <md-switch slot="end" class="m3-switch shrink-0" selected={localChecked} onClick={toggle} aria-label={title} />
    </div>
  );
};

const SliderRow = ({ title, value, min, max, onChange, suffix }) => (
  <div className="settings-category-button settings-category-button-column">
    <div className="settings-category-button-content">
      <span className="settings-category-button-title">{title}</span>
    </div>
    <div className="settings-category-button-slider">
      <md-slider class="m3-slider" min={min} max={max} value={value} onInput={(e) => onChange(Number(e.currentTarget.value))} />
      <span className="settings-category-button-slider-value">{value}{suffix}</span>
    </div>
  </div>
);

const SelectRow = ({ title, defaultValue, options }) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="settings-category-button">
      <div className="settings-category-button-content">
        <span className="settings-category-button-title">{title}</span>
      </div>
      <md-outlined-select slot="end" class="m3-select settings-inline-select" value={value} onInput={(e) => setValue(e.currentTarget.value)}>
        {options.map((option) => <md-select-option key={option} value={option} selected={value === option}>{option}</md-select-option>)}
      </md-outlined-select>
    </div>
  );
};

const TextField = ({ label, defaultValue }) => (
  <md-outlined-text-field class="m3-text-field" label={label} value={defaultValue} />
);

const KeybindRow = ({ action, keys }) => (
  <div className="settings-category-button">
    <div className="settings-category-button-content">
      <span className="settings-category-button-title">{action}</span>
    </div>
    <kbd className="settings-category-button-kbd">{keys}</kbd>
  </div>
);

export default AppSettings;
