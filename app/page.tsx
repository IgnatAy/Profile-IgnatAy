'use client';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowUpRight,
  Camera,
  Code2,
  Gamepad2,
  MapPin,
  Menu,
  Satellite,
  UserRound,
  X,
  Laptop,
  Compass,
  Globe2,
} from 'lucide-react';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { DeferredCompanion } from '@/components/deferred-companion';
import { FadedSwap, FadedSwapReady } from '@/components/faded-swap';
import { homeEasterEgg } from '@/models/alice/alice-home-easter-egg';
const ProfileSection = lazy(() => import('@/components/profile-sections'));
import { socials, type Language } from '@/lib/profile';
import {
  getLanguage,
  subscribeLanguage,
  saveLanguage,
  subscribeHash,
} from '@/lib/browser-preferences';

const sections = [
  { id: 'about', en: 'About me', zh: '基础信息', icon: UserRound },
  { id: 'academic', en: 'Academics', zh: '学术', icon: Satellite },
  { id: 'entertainment', en: 'Entertainment', zh: '娱乐', icon: Gamepad2 },
  { id: 'digital', en: 'Digital life', zh: '数码', icon: Laptop },
  { id: 'projects', en: 'Projects', zh: '个人开发', icon: Code2 },
  { id: 'photography', en: 'Travel & photos', zh: '旅行摄影', icon: Camera },
] as const;
type Section = (typeof sections)[number]['id'];
const getSection = (): Section => {
  const id = location.hash.slice(1);
  if (['gaming', 'anime', 'music'].includes(id)) return 'entertainment';
  return sections.find((item) => item.id === id)?.id ?? 'about';
};
const interests = [
  { icon: Gamepad2, en: 'Single-player games', zh: '单机游戏' },
  { icon: Laptop, en: 'Digital things', zh: '数码' },
  { icon: Code2, en: 'Programming', zh: '编程' },
  { icon: Compass, en: 'Travel', zh: '旅行' },
  { icon: Camera, en: 'Photography', zh: '摄影' },
];

export default function Home() {
  const lang = useSyncExternalStore<Language>(
    subscribeLanguage,
    getLanguage,
    () => 'en',
  );
  const section = useSyncExternalStore<Section>(
    subscribeHash,
    getSection,
    () => 'about',
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNoticeDismissed, setMobileNoticeDismissed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterNavigation = useRef(false);
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);
  const switchLanguage = () => saveLanguage(lang === 'en' ? 'zh' : 'en');
  const navigate = (id: Section) => {
    focusAfterNavigation.current = id !== section;
    window.location.assign(`#${id}`);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (id === section) heading.current?.focus({ preventScroll: true });
  };
  const navigation = (drawer = false) => (
    <nav
      aria-label={t('Main navigation', '主导航')}
      className={drawer ? 'drawer-links' : 'dock-links'}
    >
      {sections.map(({ id, en, zh, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => navigate(id)}
          aria-label={t(en, zh)}
          aria-current={section === id ? 'page' : undefined}
        >
          <span className="dock-icon" aria-hidden="true">
            <Icon size={20} strokeWidth={1.7} />
          </span>
          <span className="dock-label">{t(en, zh)}</span>
        </a>
      ))}
    </nav>
  );
  return (
    <SidebarProvider className="profile-shell">
      <a
        href="#page-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
        }}
      >
        {t('Skip to content', '跳转到内容')}
      </a>
      <header className="site-header">
        <a
          className="site-logo"
          href="#about"
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            homeEasterEgg.request(getSection());
            navigate('about');
          }}
          aria-label={t('Ignat · Home', 'Ignat · 主页')}
        >
          <img src="./icons/alice-logo.jpg" alt="" width={56} height={56} />
        </a>
        <div className="header-location">
          <span className="status-dot" />
          {t('Shanghai, CN', '中国 · 上海')}
        </div>
        <div className="header-actions">
          <button
            className="language-toggle"
            onClick={switchLanguage}
            aria-label={t('Switch to Chinese', '切换到英文')}
          >
            <Globe2 size={15} />
            <span className={lang === 'en' ? 'chosen' : ''}>EN</span>
            <i>/</i>
            <span className={lang === 'zh' ? 'chosen' : ''}>中</span>
          </button>
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('Open navigation', '打开导航')}
            aria-expanded={menuOpen}
          >
            <Menu size={21} />
          </button>
        </div>
      </header>
      <Sidebar collapsible="none" className="desktop-dock">
        {navigation()}
      </Sidebar>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="mobile-drawer"
          showCloseButton={false}
        >
          <div className="drawer-header">
            <SheetTitle>
              Ignat<span className="accent-dot">.</span>
            </SheetTitle>
            <SheetClose
              className="icon-button"
              aria-label={t('Close navigation', '关闭导航')}
            >
              <X size={21} />
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            {t('Choose a section', '选择一个板块')}
          </SheetDescription>
          {navigation(true)}
          <div className="drawer-footer">
            <MapPin size={14} />
            {t('Based in Shanghai', '现居上海')}
          </div>
        </SheetContent>
      </Sheet>
      <FadedSwap
        value={section}
        className="page-transition"
        onShown={() => {
          if (focusAfterNavigation.current) {
            focusAfterNavigation.current = false;
            heading.current?.focus({ preventScroll: true });
          }
        }}
      >
        {(section, onReady, isActive) => {
          const active = sections.find((item) => item.id === section)!;
          return (
            <main
              id={isActive ? 'page-content' : undefined}
              className={`page-content page-${section}`}
              key={section}
            >
              {!mobileNoticeDismissed && (
                <aside
                  className="mobile-desktop-notice"
                  aria-label={t('Browsing tip', '浏览提示')}
                >
                  <Laptop size={20} aria-hidden="true" />
                  <p>
                    {t(
                      'Visit on a desktop for the full browsing experience.',
                      '通过桌面端访问，获得完整的浏览体验。',
                    )}
                  </p>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setMobileNoticeDismissed(true)}
                    aria-label={t('Dismiss browsing tip', '关闭浏览提示')}
                  >
                    <X size={18} />
                  </button>
                </aside>
              )}
              {section === 'about' ? (
                <>
                  <FadedSwapReady onReady={onReady} />
                  <section className="intro-section">
                    <h1 ref={isActive ? heading : undefined} tabIndex={-1}>
                      <span>
                        Ignat<span className="accent-dot">.</span>
                      </span>
                    </h1>
                    <p className="intro-description">
                      {t(
                        'PhD student · Shanghai Jiao Tong University',
                        '博士生 · 上海交通大学',
                      )}
                    </p>
                    <div className="identity-tags">
                      <span>
                        <MapPin size={14} />
                        {t('Shanghai', '上海')}
                      </span>
                    </div>
                  </section>
                  <section
                    className="social-section"
                    aria-labelledby="social-title"
                  >
                    <h2 id="social-title" className="sr-only">
                      {t('Social profiles', '社交账号')}
                    </h2>
                    <div className="social-grid">
                      {socials.map((social) => (
                        <a
                          key={social.name}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${social.name === 'Bilibili' ? t('Bilibili', '哔哩哔哩') : social.name} · ${social.name === 'Bilibili' ? '1247015270' : 'IgnatAy'}`}
                          title={
                            social.name === 'Bilibili'
                              ? t('Bilibili', '哔哩哔哩')
                              : social.name
                          }
                        >
                          <span
                            className="social-icon"
                            aria-hidden="true"
                            style={{
                              maskImage: `url("./icons/${social.icon}.svg")`,
                              WebkitMaskImage: `url("./icons/${social.icon}.svg")`,
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                  <section className="about-notes">
                    <div className="section-label">
                      <h2>{t('Interests', '爱好')}</h2>
                    </div>
                    <div className="interest-list">
                      {interests.map(({ icon: Icon, en, zh }) => (
                        <span key={en}>
                          <Icon size={16} />
                          {t(en, zh)}
                        </span>
                      ))}
                    </div>
                    <a
                      className="now-note"
                      href="#academic"
                      onClick={() => navigate('academic')}
                    >
                      <Satellite size={17} />
                      <span>{t('Information & Control', '信息控制')}</span>
                      <ArrowUpRight size={20} />
                    </a>
                  </section>
                  <a
                    href="#photography"
                    className="photo-teaser"
                    onClick={() => navigate('photography')}
                  >
                    <span>
                      <Camera size={16} />
                      {t('Travel & photography', '旅行与摄影')}
                    </span>
                    <ArrowUpRight size={22} />
                  </a>
                </>
              ) : (
                <>
                  <div className="section-heading">
                    <h1 ref={isActive ? heading : undefined} tabIndex={-1}>
                      {t(active.en, active.zh)}
                      <span className="accent-dot">.</span>
                    </h1>
                  </div>
                  <Suspense
                    fallback={
                      <output className="section-loading">
                        {t('Loading…', '加载中…')}
                      </output>
                    }
                  >
                    <ProfileSection section={section} lang={lang} />
                    <FadedSwapReady onReady={onReady} />
                  </Suspense>
                </>
              )}
              <footer className="site-footer">
                <span>© {new Date().getFullYear()} Ignat</span>
              </footer>
            </main>
          );
        }}
      </FadedSwap>
      <DeferredCompanion lang={lang} section={section} />
    </SidebarProvider>
  );
}
