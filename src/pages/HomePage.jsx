// Landing page — hero, project cards, pattern cards.
// Requirement: the featured set has no internal tools, so this page must not
//   keep an empty "Internal Tools" section or a card component nothing renders.
// Approach: ToolCard and the #tools section are removed with the TOOLS data.
// Alternatives:
// - Render the section only when TOOLS is non-empty: rejected — the list is
//   gone, and the conditional would leave a dead nav target and unused card.
// Requirement: the SSG pass renders this with the pattern manifest passed as a
//   prop (crawlers need real links without running JS); the client render
//   fetches the manifest and replaces the grid. `prerender` also disables the
//   scroll-in animation classes: without JS nothing would ever lift
//   scroll-animate's opacity:0, so the static output must not carry it.
import { useEffect, useRef, useState } from 'react';
import { HERO, PROJECTS } from '../data/homeContent.js';

const BASE = import.meta.env.BASE_URL;

// Scroll-triggered fade-in. The revealed set is REACT STATE, not an imperative
// classList write: these elements' className is React-owned (card activation
// re-renders it), and React's attribute write would wipe any class an observer
// added behind its back — tapping a card made it fade to opacity:0 until the
// review caught it. Observer disconnected on unmount; revealed elements are
// skipped on re-observe (new pattern cards arrive after the manifest loads).
function useScrollAnimate(containerRef, deps) {
  const [revealed, setRevealed] = useState(() => new Set());
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.dataset.revealId;
          observer.unobserve(entry.target);
          if (id) setRevealed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    container.querySelectorAll('[data-reveal-id]').forEach((el) => {
      if (!revealedRef.current.has(el.dataset.revealId)) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return revealed;
}

// Card tap behavior: tapping a card reveals its action links (card-active);
// tapping outside deactivates. One document listener, released on unmount.
function useActiveCard() {
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (activeId === null) return;
    const onDocClick = (e) => {
      if (!e.target.closest('[data-card-id="' + activeId + '"]')) setActiveId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [activeId]);

  const toggle = (id, e) => {
    if (e.target.closest('.card-links a')) return;   // let link clicks through
    setActiveId((current) => (current === id ? null : id));
  };
  return [activeId, toggle];
}

function cardClass(animate, active, shown) {
  return 'card bg-base-200/50 border border-base-300 card-interactive' +
    (animate ? ' scroll-animate' : '') +
    (shown ? ' animate-in' : '') +
    (active ? ' card-active' : '');
}

function ProjectCard({ project, animate, active, shown, onToggle, delay }) {
  return (
    <div
      className={cardClass(animate, active, shown)}
      data-delay={animate ? delay : undefined}
      data-card-id={project.slug}
      data-reveal-id={animate ? `project-${project.slug}` : undefined}
      onClick={(e) => onToggle(project.slug, e)}
    >
      <div className="card-body">
        <h3 className="card-title text-base">
          {project.title}
          {project.badges.map((b) => (
            <span key={b.label} className={`badge badge-sm ${b.primary ? 'badge-primary' : 'badge-ghost'}`}>
              {b.label}
            </span>
          ))}
        </h3>
        <p className="text-sm text-base-content/70 grow">{project.description}</p>
        <div className="mt-auto pt-2">
          <p className="text-xs text-base-content/40">{project.tech}</p>
          <div className="card-links">
            <a href={`${BASE}projects/${project.slug}/`} className="btn btn-sm btn-primary rounded-full">Details</a>
            {project.live && (
              <a href={project.live} target="_blank" rel="noopener" className="btn btn-sm btn-outline rounded-full">Live app</a>
            )}
            {project.source && (
              <a href={project.source} target="_blank" rel="noopener" className="btn btn-sm btn-outline rounded-full">Source</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatternCard({ pattern, animate, active, shown, onToggle, delay }) {
  return (
    <div
      className={cardClass(animate, active, shown)}
      data-delay={animate ? delay : undefined}
      data-card-id={pattern.slug}
      data-reveal-id={animate ? `pattern-${pattern.slug}` : undefined}
      onClick={(e) => onToggle(pattern.slug, e)}
    >
      <div className="card-body">
        <h3 className="font-semibold text-base mb-1">{pattern.title}</h3>
        <p className="text-sm text-base-content/70 grow">{pattern.description}</p>
        <div className="mt-auto pt-2">
          {pattern.tags.length > 0 && (
            <p className="text-xs text-base-content/40">{pattern.tags.join(' · ')}</p>
          )}
          <div className="card-links">
            <a href={`${BASE}patterns/${encodeURIComponent(pattern.slug)}/`} className="btn btn-sm btn-primary rounded-full">
              View pattern
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage({ patterns: initialPatterns = null, prerender = false }) {
  const animate = !prerender;
  const containerRef = useRef(null);
  const [activeId, toggleActive] = useActiveCard();
  const [patterns, setPatterns] = useState(initialPatterns);
  const [patternsError, setPatternsError] = useState(false);

  // Client fetch of the pattern manifest (the SSG pass passes it as a prop
  // instead). Same hygiene as the pattern/project pages: HTTP failures are
  // failures, a 10s timeout stops an eternal "Loading patterns...", and the
  // timer clears in finally — after the body parses. timedOut distinguishes
  // the timeout abort (show the error) from the unmount abort (stay silent).
  useEffect(() => {
    if (prerender || patterns) return;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
    fetch(`${BASE}patterns/manifest.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((manifest) => setPatterns(manifest.patterns))
      .catch((err) => {
        if (err && err.name === 'AbortError' && !timedOut) return;
        setPatternsError(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealed = useScrollAnimate(containerRef, [patterns]);
  // Section headings share the same reveal mechanism as the cards — a bare
  // scroll-animate class with no reveal path would stay at opacity:0 forever.
  const headingClass = (base, id) =>
    base + (animate ? ' scroll-animate' + (revealed.has(id) ? ' animate-in' : '') : '');

  return (
    <div ref={containerRef}>
      <header className="pt-4 pb-6 animate-fade-in-up">
        {/* Primary→accent gradient auto-matches every theme combo; monochrome
            themes degrade to solid text, matching their minimalism. */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {HERO.title}
        </h1>
        <p className="text-base-content/60 text-lg max-w-xl">{HERO.subtitle}</p>
      </header>

      <section id="projects" className="mb-12">
        <h2 className={headingClass('text-2xl font-bold mb-2', 'projects-h')} data-reveal-id={animate ? 'projects-h' : undefined}>Projects</h2>
        <p className={headingClass('text-base-content/60 mb-6 max-w-xl', 'projects-p')} data-reveal-id={animate ? 'projects-p' : undefined}>
          User-facing applications — each solves a real problem.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROJECTS.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              animate={animate}
              active={activeId === project.slug}
              shown={revealed.has(`project-${project.slug}`)}
              onToggle={toggleActive}
              delay={String((i % 3) + 1)}
            />
          ))}
        </div>
      </section>

      <section id="patterns" className="mb-12">
        <h2 className={headingClass('text-2xl font-bold mb-2', 'patterns-h')} data-reveal-id={animate ? 'patterns-h' : undefined}>Patterns</h2>
        <p className={headingClass('text-base-content/60 mb-6 max-w-xl', 'patterns-p')} data-reveal-id={animate ? 'patterns-p' : undefined}>
          Reusable implementation patterns extracted from real projects. Each is documented with
          requirements, approach, alternatives considered, and key lessons.{' '}
          <a href={`${BASE}CLAUDE.md`} className="link link-primary">View full reference</a>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {patterns && patterns.length === 0 ? (
            <p className="text-base-content/40 text-sm col-span-full text-center py-8">
              No patterns published yet.
            </p>
          ) : patterns ? (
            patterns.map((pattern, i) => (
              <PatternCard
                key={pattern.slug}
                pattern={pattern}
                animate={animate}
                active={activeId === pattern.slug}
                shown={revealed.has(`pattern-${pattern.slug}`)}
                onToggle={toggleActive}
                delay={String((i % 3) + 1)}
              />
            ))
          ) : (
            <p className="text-base-content/40 text-sm col-span-full text-center py-8">
              {patternsError ? 'Couldn’t load the patterns. Check your connection and reload the page.' : 'Loading patterns...'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
