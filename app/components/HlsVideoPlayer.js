"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";

const HLS_SCRIPT_ID = "hls-js-cdn";
const HLS_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
const DEFAULT_VOLUME = 0.9;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const mins = Math.floor(wholeSeconds / 60);
  const secs = wholeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function loadHlsScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.Hls) {
    return Promise.resolve(window.Hls);
  }

  const existingScript = document.getElementById(HLS_SCRIPT_ID);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(window.Hls), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load hls.js")),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = HLS_SCRIPT_ID;
    script.src = HLS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Hls);
    script.onerror = () => reject(new Error("Failed to load hls.js"));
    document.head.appendChild(script);
  });
}

export default function HlsVideoPlayer({
  src,
  fallbackSrc,
  sourceOptions = [],
  className,
  wrapperClassName,
  controls = false,
  playsInline = true,
  preload = "metadata",
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const selectedQualityRef = useRef("auto");
  const wrapperRef = useRef(null);
  const [levels, setLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [autoQualityLabel, setAutoQualityLabel] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qualityOptions = useMemo(() => {
    if (levels.length > 0) {
      return [
        {
          value: "auto",
          label: autoQualityLabel ? `Auto (${autoQualityLabel})` : "Auto",
        },
        ...levels.map((level) => {
          const width = level.width || 0;
          const height = level.height || 0;
          const resolution =
            width > 0 && height > 0
              ? `${height}p`
              : `${Math.round((level.bitrate || 0) / 1000)} kbps`;

          return {
            value: String(height || level.index),
            label: resolution,
          };
        }),
      ];
    }

    if (sourceOptions.length > 0) {
      return sourceOptions.map((option) => ({
        value: option.value,
        label: option.label,
      }));
    }

    return [{ value: "auto", label: "Auto" }];
  }, [autoQualityLabel, levels, sourceOptions]);

  useEffect(() => {
    selectedQualityRef.current = selectedQuality;
  }, [selectedQuality]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.volume = DEFAULT_VOLUME;
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const activeElement = document.fullscreenElement;
      setIsFullscreen(activeElement === wrapperRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      return;
    }

    let hlsInstance = null;
    let isCancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    const attachWithHlsJs = async () => {
      try {
        const Hls = await loadHlsScript();

        if (isCancelled || !Hls || !Hls.isSupported()) {
          if (fallbackSrc) {
            video.src = fallbackSrc;
          }
          return;
        }

        hlsInstance = new Hls({
          enableWorker: true,
        });
        hlsRef.current = hlsInstance;

        hlsInstance.on(Hls.Events.ERROR, (_, data) => {
          if (!data?.fatal) {
            return;
          }

          hlsInstance.destroy();
          hlsInstance = null;
          setLevels([]);
          setSelectedQuality("auto");
          setAutoQualityLabel("");

          if (fallbackSrc) {
            video.src = fallbackSrc;
          }
        });

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (isCancelled) {
            return;
          }

          const parsedLevels = (data?.levels || []).map((level, index) => ({
            ...level,
            index,
          }));
          setLevels(parsedLevels);
          setSelectedQuality("auto");
        });

        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          if (isCancelled || selectedQualityRef.current !== "auto") {
            return;
          }

          const current = hlsInstance.levels?.[data.level];
          if (!current) {
            setAutoQualityLabel("");
            return;
          }

          if (current.height) {
            setAutoQualityLabel(`${current.height}p`);
            return;
          }

          if (current.bitrate) {
            setAutoQualityLabel(`${Math.round(current.bitrate / 1000)} kbps`);
            return;
          }

          setAutoQualityLabel("");
        });

        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(video);
      } catch {
        if (!isCancelled && fallbackSrc) {
          video.src = fallbackSrc;
        }
      }
    };

    attachWithHlsJs();

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      hlsRef.current = null;
    };
  }, [fallbackSrc, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // Ignore browser autoplay/play interruption errors.
      }
      return;
    }

    video.pause();
  };

  const handleSeek = (event) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextTime = Number(event.target.value);
    if (Number.isNaN(nextTime)) {
      return;
    }

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleVolumeInput = (event) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextVolume = Number(event.target.value);
    if (Number.isNaN(nextVolume)) {
      return;
    }

    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.muted || video.volume === 0) {
      const nextVolume = volume > 0 ? volume : DEFAULT_VOLUME;
      video.muted = false;
      video.volume = nextVolume;
      setIsMuted(false);
      setVolume(nextVolume);
      return;
    }

    video.muted = true;
    setIsMuted(true);
  };

  const toggleFullscreen = async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen();
      return;
    }

    await wrapper.requestFullscreen();
  };

  const handleQualityChange = (event) => {
    const nextQuality = event.target.value;
    setSelectedQuality(nextQuality);

    const player = hlsRef.current;
    if (player && levels.length > 0) {
      if (nextQuality === "auto") {
        player.currentLevel = -1;
        player.nextLevel = -1;
        return;
      }

      const targetHeight = Number(nextQuality);
      const matchedLevel = levels.find((level) => level.height === targetHeight);

      if (matchedLevel) {
        player.currentLevel = matchedLevel.index;
        player.nextLevel = matchedLevel.index;
      }
      return;
    }

    const video = videoRef.current;
    if (!video || sourceOptions.length === 0) {
      return;
    }

    const selectedSource = sourceOptions.find(
      (option) => option.value === nextQuality
    );
    if (!selectedSource?.src) {
      return;
    }

    const wasPlaying = !video.paused;
    const lastTime = video.currentTime || 0;
    const handleLoadedMetadata = () => {
      if (lastTime > 0 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(lastTime, video.duration);
      }

      if (wasPlaying) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata, {
      once: true,
    });
    video.src = selectedSource.src;
    video.load();
  };

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <video
        ref={videoRef}
        className={className}
        controls={controls}
        playsInline={playsInline}
        preload={preload}
        onDoubleClick={toggleFullscreen}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 md:p-4">
        <div className="pointer-events-auto rounded-xl border border-white/20 bg-black/65 px-3 py-3 backdrop-blur-sm">
          <input
            type="range"
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-white"
            aria-label="Seek video"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white md:text-sm">
            <button
              type="button"
              onClick={handlePlayPause}
              className="rounded-md border border-white/25 px-2.5 py-1 font-medium transition hover:bg-white/15"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <span className="min-w-24 font-mono tabular-nums text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              type="button"
              onClick={toggleMute}
              className="rounded-md border border-white/25 px-2.5 py-1 font-medium transition hover:bg-white/15"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeInput}
              className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-white md:w-24"
              aria-label="Volume"
            />

            <div className="relative">
              <label htmlFor="quality-selector" className="sr-only">
                Select video quality
              </label>
              <SlidersHorizontal
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/80"
                aria-hidden="true"
              />
              <select
                id="quality-selector"
                value={selectedQuality}
                onChange={handleQualityChange}
                className="rounded-md border border-white/25 bg-black/55 py-1 pl-7 pr-2 text-xs font-semibold text-white outline-none transition hover:bg-white/20"
                disabled={qualityOptions.length <= 1}
              >
                {qualityOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-white text-slate-900"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="ml-auto rounded-md border border-white/25 px-2.5 py-1 font-medium transition hover:bg-white/15"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
