/* oxlint-disable nextjs/no-img-element -- Static hosting uses local photos and remote preview covers. */
import { useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Code2,
  Gamepad2,
  Headphones,
  Satellite,
  Laptop,
  Smartphone,
  Tablet,
  Watch,
  Circle,
  Ear,
  AudioLines,
  MapPin,
  FileText,
  Play,
} from 'lucide-react';
import { devices, photos, socials, type Language } from '@/lib/profile';
import { games, projects, publication, videos } from '@/lib/collections';
export function AcademicSection({ lang }: { lang: Language }) {
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  return (
    <div className="academic-content">
      <div className="research-tags">
        {[
          'Low Earth orbit satellites|低轨卫星',
          'Deep-space positioning|深空定位',
          'Earth–Moon navigation|地月导航',
        ].map((item) => {
          const [en, zh] = item.split('|');
          return (
            <span key={en}>
              <Satellite size={16} />
              {t(en, zh)}
            </span>
          );
        })}
      </div>
      <div className="timeline">
        <article>
          <span className="timeline-date">2026 — {t('PRESENT', '至今')}</span>
          <div>
            <span className="current-badge">{t('CURRENT', '在读')}</span>
            <h2>{t('Shanghai Jiao Tong University', '上海交通大学')}</h2>
            <h3>
              {t('School of Aeronautics and Astronautics', '航空航天学院')}
            </h3>
            <p>
              {t(
                'PhD studies in Information and Control · Full-time doctoral student',
                '信息控制博士研究生 · 全日制博士生',
              )}
            </p>
            <p className="muted">
              {t(
                'Participant in the Zhiyuan Honors Doctorate Program.',
                '参与博士生致远荣誉计划。',
              )}
            </p>
          </div>
        </article>
        <article>
          <span className="timeline-date">2022 — 2026</span>
          <div>
            <h2>
              <span className="school-name">
                {t('Shanghai Jiao Tong University', '上海交通大学')}
              </span>
              <span className="school-plus">+</span>
              <span className="school-name">
                {t('Moscow Aviation Institute', '莫斯科航空学院')}
              </span>
            </h2>
            <h3>
              {t(
                'SJTU–MAI Joint Undergraduate Program',
                '交大—莫航本科联合培养项目',
              )}
            </h3>
            <p>
              {t(
                'Bachelor of Engineering degrees awarded by both universities.',
                '取得两校的工学学士学位。',
              )}
            </p>
            <p className="muted">
              {t(
                'School of Aeronautics and Astronautics, Shanghai Jiao Tong University.',
                '上海交通大学航空航天学院。',
              )}
            </p>
          </div>
        </article>
      </div>
      <section className="publication-section" aria-labelledby="publications-heading">
        <div className="collection-heading">
          <h2 id="publications-heading">{t('Publications', '学术成果')}</h2>
          <span>01</span>
        </div>
        <a className="publication-card" href={publication.url} target="_blank" rel="noopener noreferrer">
          <div className="publication-mark" aria-hidden="true">
            <FileText size={30} strokeWidth={1.3} />
            <span>PLANS</span>
            <strong>{publication.year}</strong>
          </div>
          <div className="publication-body">
            <div className="preview-meta"><span>IEEE / ION</span><span className="authorship-badge">{t('First author', '第一作者')}</span></div>
            <h3>{publication.title}</h3>
            <p className="publication-authors"><strong>{publication.authors[0]}</strong>{`, ${publication.authors.slice(1).join(', ')}`}</p>
            <p>{publication.venue} · {t('pp.', '页码')} {publication.pages}</p>
            <p className="publication-doi">DOI: {publication.doi}</p>
            <span className="preview-action">{t('View on IEEE Xplore', '在 IEEE Xplore 查看')}<ArrowUpRight size={16} aria-hidden="true" /></span>
          </div>
        </a>
      </section>
    </div>
  );
}
export function DigitalSection({ lang }: { lang: Language }) {
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  const icons = {
    laptop: Laptop,
    phone: Smartphone,
    tablet: Tablet,
    watch: Watch,
    camera: Camera,
    lens: Circle,
    headphones: Headphones,
    earbuds: Ear,
    audio: AudioLines,
    gamepad: Gamepad2,
  };
  const groups = [
    { id: 'computers', en: 'Computing', zh: '电脑' },
    { id: 'everyday', en: 'Everyday carry', zh: '日常随身' },
    { id: 'photo', en: 'Behind the lens', zh: '摄影器材' },
    { id: 'audio', en: 'Listening', zh: '音频设备' },
    { id: 'gaming', en: 'Play', zh: '游戏外设' },
  ];
  return (
    <>
      {groups.map((group) => (
        <section className="device-group" key={group.id}>
          <div className="section-label">
            <h2>{t(group.en, group.zh)}</h2>
          </div>
          <div className="device-grid">
            {devices
              .filter((device) => device.group === group.id)
              .map((device) => {
                const Icon = icons[device.icon];
                return (
                  <article className="device" key={device.name}>
                    <span className="device-icon">
                      <Icon size={23} strokeWidth={1.4} />
                    </span>
                    <div>
                      <h3>
                        {lang === 'zh' && 'zhName' in device
                          ? device.zhName
                          : device.name}
                      </h3>
                      <p>{t(device.detail, device.zhDetail)}</p>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
const photoChapters = [
  { en: 'Moscow & Istra', zh: '莫斯科与伊斯特拉', note: 'CITY / LIGHT', ids: ['dsc_0175', 'dsc_0583', 'dsc_1595_4', 'dsc_2958', 'dsc_5161_1', 'dsc_9079_3'] },
  { en: 'Saint Petersburg', zh: '圣彼得堡', note: 'RIVER / STREETS', ids: ['dsc_7205_1', 'dsc_7217', 'dsc_7596_4', 'dsc_9011_2', 'dsc_9723', 'dsc_9846_5'] },
  { en: 'Elbrus & Teriberka', zh: '厄尔布鲁士与捷里别尔卡', note: 'SNOW / SILENCE', ids: ['dsc_4778', 'dsc_6546_2', 'dsc_6634'] },
  { en: 'Istanbul & Göreme', zh: '伊斯坦布尔与格雷梅', note: 'STONE / WIND', ids: ['dsc_1703', 'dsc_1780'] },
  { en: 'Dubai', zh: '迪拜', note: 'SAND / SKY', ids: ['dsc_3199', 'dsc_3597', 'dsc_3684', 'dsc_3816'] },
  { en: 'Kyoto', zh: '京都', note: 'VERMILION / SHADOW', ids: ['img_5801'] },
];

export function PhotoSection({ lang }: { lang: Language }) {
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  const cover = photos[0];
  const photoLink = (photo: (typeof photos)[number], eager = false) => (
    <a
      className="photo-image-link"
      href={`./photos/${photo.file}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(`View ${photo.en} — opens full image in a new tab`, `查看「${photo.zh}」大图（新标签页）`)}
    >
      <img
        src={`./photos/thumbs/${photo.file}`}
        srcSet={`./photos/thumbs/${photo.file} ${photo.thumbnail.width}w, ./photos/${photo.file} ${photo.width}w`}
        sizes="(max-width: 560px) 90vw, (max-width: 760px) 44vw, (max-width: 1120px) 55vw, 32vw"
        width={photo.width}
        height={photo.height}
        alt={t(photo.alt, photo.zhAlt)}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className="photo-expand" aria-hidden="true"><ArrowUpRight size={20} /></span>
    </a>
  );
  return (
    <div className="travel-journal">
      <div className="journal-edition">
        <span>PHOTOGRAPHY BY IGNAT</span>
        <span>{String(photos.length).padStart(2, '0')} / {t('FRAMES', '帧影像')}</span>
      </div>
      <div className="journal-authorship">
        <p>{t('All photographs below were taken by me.', '以下内容均为本人拍摄。')}</p>
        <a href={socials.find((social) => social.name === 'Instagram')!.url} target="_blank" rel="noopener noreferrer">
          {t('More on Instagram', '更多内容，访问我的 Instagram')}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <figure className="journal-cover">
        {photoLink(cover, true)}
        <figcaption>
          <span className="journal-eyebrow">{t('OPENING FRAME', '开篇影像')} / 01</span>
          <h2>{t('Through', '穿过')}<br /><em>{t('the gold.', '金色。')}</em></h2>
          <p className="cover-description">{t(cover.description, cover.zhDescription)}</p>
          <div className="cover-location">
            <MapPin size={16} aria-hidden="true" />
            <span>{t(cover.location, cover.zhLocation)}</span>
          </div>
          <span className="cover-signature">Ignat</span>
        </figcaption>
      </figure>
      {photoChapters.map((chapter, chapterIndex) => (
        <section className="photo-chapter" key={chapter.en} aria-labelledby={`photo-chapter-${chapterIndex}`}>
          <header className="chapter-heading">
            <span className="chapter-number">{String(chapterIndex + 1).padStart(2, '0')}</span>
            <div>
              <p>{chapter.note}</p>
              <h2 id={`photo-chapter-${chapterIndex}`}>{t(chapter.en, chapter.zh)}</h2>
            </div>
            <span className="chapter-count">{String(chapter.ids.length).padStart(2, '0')} {t('frames', '帧')}</span>
          </header>
          <div className={`photo-grid${chapter.ids.length === 1 ? ' photo-grid-single' : ''}`}>
            {chapter.ids.map((id) => {
              const photo = photos.find((item) => item.id === id)!;
              return (
                <figure key={photo.file}>
                  {photoLink(photo)}
                  <figcaption>
                    <div className="photo-caption-heading">
                      <h3>{t(photo.en, photo.zh)}</h3>
                      <span className="photo-frame-number">{String(photos.indexOf(photo) + 1).padStart(2, '0')}</span>
                    </div>
                    <p className="photo-location">{t(photo.location, photo.zhLocation)}</p>
                    <p className="photo-description">{t(photo.description, photo.zhDescription)}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
      <div className="camera-note">
        <Camera size={20} strokeWidth={1.4} aria-hidden="true" />
        <div><span className="journal-eyebrow">BEHIND THE LENS</span><p>Nikon Z 7II <i>+</i> NIKKOR Z 24-120mm f/4 S</p></div>
        <span className="journal-end">{t('Until the next frame.', '下一程，再见。')}</span>
      </div>
    </div>
  );
}
function RemotePreview({ src, kind, lang }: { src: string; kind: 'video' | 'game'; lang: Language }) {
  const [failed, setFailed] = useState(false);
  const Icon = kind === 'game' ? Gamepad2 : Play;
  return (
    <div className={`remote-preview remote-preview-${kind}`}>
      {failed ? (
        <div className="preview-fallback"><Icon size={30} strokeWidth={1.3} aria-hidden="true" /><span>{lang === 'zh' ? '在原站查看预览' : 'View preview on source site'}</span></div>
      ) : (
        <img src={src} alt="" width={kind === 'game' ? 460 : 480} height={kind === 'game' ? 215 : 360} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
      {kind === 'video' && !failed && <span className="preview-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>}
      <span className="preview-external" aria-hidden="true"><ArrowUpRight size={18} /></span>
    </div>
  );
}

export function CollectionSection({ section, lang }: { section: 'entertainment' | 'projects'; lang: Language }) {
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  if (section === 'projects') {
    return (
      <section className="link-collection" aria-labelledby="projects-heading">
        <div className="collection-heading">
          <h2 id="projects-heading">{t('Public repositories', '公开仓库')}</h2>
          <a href="https://github.com/IgnatAy" target="_blank" rel="noopener noreferrer">GitHub · IgnatAy <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="preview-grid">
          {projects.map((project) => (
            <a className="preview-card" key={project.name} href={project.url} target="_blank" rel="noopener noreferrer" aria-label={t(`View ${project.name} on GitHub (opens in a new tab)`, `在 GitHub 查看 ${project.name}（新标签页）`)}>
              <div className="preview-body">
                <div className="preview-meta"><span className="repository-label"><Code2 size={20} strokeWidth={1.4} aria-hidden="true" />GitHub</span><span>{project.language}</span></div>
                <h3>{project.name}</h3>
                <p>{t(project.description, project.zhDescription)}</p>
                <span className="preview-action">{t('Explore repository', '查看仓库')}<ArrowUpRight size={16} aria-hidden="true" /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
    );
  }
  return (
    <div className="link-collection">
      <section aria-labelledby="videos-heading">
        <div className="collection-heading"><h2 id="videos-heading">{t('Videos & music', '视频与音乐')}</h2><span>03</span></div>
        <div className="preview-grid">
          {videos.map((video) => (
            <a className="preview-card" key={video.id} href={video.url} target="_blank" rel="noopener noreferrer">
              <RemotePreview src={video.image} kind="video" lang={lang} />
              <div className="preview-body">
                <div className="preview-meta"><span>{video.platform}</span></div>
                <h3>{t(video.title, video.zhTitle)}</h3>
                <p>{video.creator}</p>
                <span className="preview-action">{t(`Watch on ${video.platform}`, `在 ${video.platform} 观看`)}<ArrowUpRight size={16} aria-hidden="true" /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="favorite-games" aria-labelledby="games-heading">
        <div className="collection-heading">
          <h2 id="games-heading">{t('Favorite games', '喜欢的游戏')}</h2>
          <a href="https://steamcommunity.com/id/IgnatAy/" target="_blank" rel="noopener noreferrer">Steam · IgnatAy <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="preview-grid">
          {games.map((game) => (
            <a className="preview-card" key={game.title} href={game.url} target="_blank" rel="noopener noreferrer">
              <RemotePreview src={game.image} kind="game" lang={lang} />
              <div className="preview-body">
                <div className="preview-meta"><span>{game.creator}</span></div>
                <h3>{t(game.title, game.zhTitle)}</h3>
                <p>{t(game.genre, game.zhGenre)}</p>
                <span className="preview-action">{t('View on Steam', '在 Steam 查看')}<ArrowUpRight size={16} aria-hidden="true" /></span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ProfileSection({
  section,
  lang,
}: {
  section:
    | 'academic'
    | 'digital'
    | 'photography'
    | 'entertainment'
    | 'projects';
  lang: Language;
}) {
  if (section === 'academic') return <AcademicSection lang={lang} />;
  if (section === 'digital') return <DigitalSection lang={lang} />;
  if (section === 'photography') return <PhotoSection lang={lang} />;
  return <CollectionSection section={section} lang={lang} />;
}
