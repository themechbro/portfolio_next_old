"use client";

import Container from "./Container";
import { projects } from "../data/projects";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Github } from "lucide-react";
import HlsVideoPlayer from "./HlsVideoPlayer";

gsap.registerPlugin(ScrollTrigger);

export default function Projects() {
  const sectionRef = useRef();
  const featuredVideoRef = useRef(null);
  const githubProfileFallback = "https://github.com/themechbro";
  const featuredVideoPath = "/videos/linkedup-hls/master.m3u8";
  const featuredVideoFallbackPath = "/videos/linkedup.mp4";
  const featuredVideoQualitySources = [
    { value: "auto", label: "Auto", src: "/videos/linkedup-hls/master.m3u8" },
    { value: "1080", label: "1080p", src: "/videos/linkedup-hls/1080p/index.m3u8" },
    { value: "720", label: "720p", src: "/videos/linkedup-hls/720p/index.m3u8" },
    { value: "480", label: "480p", src: "/videos/linkedup-hls/480p/index.m3u8" },
  ];
  const [showStreamingTip, setShowStreamingTip] = useState(false);
  const [githubStats, setGithubStats] = useState({
    loading: true,
    error: false,
    data: null,
  });

  useEffect(() => {
    if (!sectionRef.current) {
      return;
    }

    gsap.from(sectionRef.current.children, {
      y: 24,
      duration: 0.65,
      stagger: 0.14,
      ease: "power3.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 82%",
      },
    });
  }, []);

  useEffect(() => {
    if (!featuredVideoRef.current || showStreamingTip) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        setShowStreamingTip(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(featuredVideoRef.current);

    return () => observer.disconnect();
  }, [showStreamingTip]);

  useEffect(() => {
    const controller = new AbortController();

    const loadGitHubStats = async () => {
      try {
        const response = await fetch("/api/github-stats", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("GitHub stats request failed");
        }

        const data = await response.json();

        setGithubStats({
          loading: false,
          error: false,
          data,
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setGithubStats({
          loading: false,
          error: true,
          data: null,
        });
      }
    };

    loadGitHubStats();

    return () => controller.abort();
  }, []);

  const statsLink = githubStats.data?.profileUrl || githubProfileFallback;
  const featuredProject =
    projects.find((project) =>
      project.title.toLowerCase().includes("linkedin-style")
    ) || projects[0];
  const remainingProjects = projects.filter(
    (project) => project.title !== featuredProject?.title
  );
  const caseStudy = featuredProject?.caseStudy;
  const formatStat = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const statItems = [
    {
      label: "Public Repos",
      value: githubStats.loading
        ? "..."
        : githubStats.error
          ? "--"
          : formatStat(githubStats.data?.repos),
    },
    {
      label: "Followers",
      value: githubStats.loading
        ? "..."
        : githubStats.error
          ? "--"
          : formatStat(githubStats.data?.followers),
    },
    {
      label: "Total Stars",
      value: githubStats.loading
        ? "..."
        : githubStats.error
          ? "--"
          : formatStat(githubStats.data?.stars),
    },
  ];

  return (
    <section id="projects" className="py-24">
      <Container>
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Projects
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            Featured work with measurable outcomes
          </h2>
        </div>

        <div ref={sectionRef} className="space-y-5">
          {featuredProject && (
            <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
              <div className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface-strong)]">
                <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/95" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/95" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/95" />
                  <p className="ml-2 truncate text-xs font-medium text-[var(--muted-light)]">
                    Featured Walkthrough - LinkedUp
                  </p>
                </div>

                <div ref={featuredVideoRef} className="relative bg-black">
                  {showStreamingTip && (
                    <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                      Tip: This walkthrough uses adaptive HLS streaming. Select
                      quality if you want to lock a resolution.
                    </p>
                  )}

                  <HlsVideoPlayer
                    wrapperClassName="relative"
                    className="aspect-video w-full object-cover"
                    src={featuredVideoPath}
                    fallbackSrc={featuredVideoFallbackPath}
                    sourceOptions={featuredVideoQualitySources}
                    playsInline
                    preload="metadata"
                  />
                </div>
              </div>

              <div className="p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--accent)]">
                      Project Highlight
                    </p>
                    <p className="mt-4 text-sm font-semibold text-[var(--muted-light)]">
                      {featuredProject.period}
                    </p>
                    <h3 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                      {featuredProject.title}
                    </h3>
                  </div>

                  <a
                    href={featuredProject.link}
                    className="motion-button inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Source on GitHub
                    <ArrowUpRight className="button-icon h-4 w-4" aria-hidden="true" />
                  </a>
                </div>

                <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--accent)]">
                  {featuredProject.impact}
                </p>

                <p className="mt-4 max-w-4xl leading-relaxed text-[var(--muted)]">
                  {caseStudy?.overview || featuredProject.description}
                </p>

                <p className="mt-3 max-w-4xl leading-relaxed text-[var(--muted)]">
                  {featuredProject.description}
                </p>

                {featuredProject.outcomes?.length > 0 && (
                  <article className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                      Outcome Snapshot
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
                      {featuredProject.outcomes.map((outcome) => (
                        <li key={outcome}>- {outcome}</li>
                      ))}
                    </ul>
                  </article>
                )}

                {caseStudy && (
                  <>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Problem
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                          {caseStudy.problem}
                        </p>
                      </article>

                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Architecture
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
                          {caseStudy.architecture.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </article>

                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 lg:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Core Highlights
                        </p>
                        <ul className="mt-2 grid gap-1.5 text-sm text-[var(--muted)] sm:grid-cols-2">
                          {caseStudy.highlights.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </article>
                    </div>

                    <div className="mt-4 grid items-start gap-3 md:grid-cols-2">
                      <details className="self-start rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Engineering Learnings
                        </summary>
                        <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
                          {caseStudy.learnings.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </details>

                      <details className="self-start rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                          Next Improvements
                        </summary>
                        <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
                          {caseStudy.nextSteps.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {featuredProject.tech.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )}

          {remainingProjects.map((project) => (
            <article
              key={project.title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]">
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 border-b border-[var(--border)]/90 bg-[var(--surface)]/95 px-3 py-2 backdrop-blur">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                    <p className="ml-2 truncate text-xs font-medium text-[var(--muted-light)]">
                      {project.imageLabel || "Project Preview"}
                    </p>
                  </div>

                  <div className="relative aspect-[16/10]">
                    <Image
                      src={project.image || "/window.svg"}
                      alt={project.imageAlt || `${project.title} preview`}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>

                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--muted-light)]">
                        {project.period}
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                        {project.title}
                      </h3>
                    </div>

                    <a
                      href={project.link}
                      className="motion-button inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub
                      <ArrowUpRight className="button-icon h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>

                  <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--accent)]">
                    {project.impact}
                  </p>

                  <p className="mt-4 max-w-3xl leading-relaxed text-[var(--muted)]">
                    {project.description}
                  </p>

                  {project.outcomes?.length > 0 && (
                    <article className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                        Outcome Snapshot
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
                        {project.outcomes.map((outcome) => (
                          <li key={outcome}>- {outcome}</li>
                        ))}
                      </ul>
                    </article>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}

          <article className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-[var(--accent)]/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--accent)]">
                  <Github className="h-3.5 w-3.5" aria-hidden="true" />
                  More Builds Available
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Explore more projects on my GitHub
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                  I regularly ship experiments, backend systems, and full-stack
                  builds beyond these featured highlights.
                </p>

                <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-3">
                  {statItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3"
                    >
                      <p className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                        {item.value}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-light)]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={statsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="motion-button inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                View All Repositories
                <ArrowUpRight className="button-icon h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}
