// src/QuranKaraoke.jsx

import { useEffect, useRef, useState } from "react";
import { fetchSelectedSurahs } from "./quranApi";

export default function QuranKaraoke() {
  const [surahs, setSurahs] = useState([]);
  const [selectedSurahIndex, setSelectedSurahIndex] = useState(0);
  const [mode, setMode] = useState("learning"); // "learning" | "practice"
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reciter selection, default = Yasser (4)
  const [reciter, setReciter] = useState("4");

  // For learning mode highlighting – per-ayah durations
  const [ayahDurations, setAyahDurations] = useState([]);

  const audioRef = useRef(null);

  // ⭐ new: refs for each ayah to auto-scroll into view
  const ayahRefs = useRef([]);

  const selectedSurah = surahs[selectedSurahIndex] || null;
  const ayahs = selectedSurah?.ayahs || [];

  // Load surahs initially + whenever reciter changes
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchSelectedSurahs(reciter);
        setSurahs(data);
        setSelectedSurahIndex(0);
      } catch (e) {
        setError(e.message || "Failed to load surahs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reciter]);

  // Reset playback when surah or mode changes
  useEffect(() => {
    resetPlayback();
  }, [selectedSurahIndex, mode]);

  function resetPlayback() {
    setCurrentAyahIndex(0);
    setIsUserTurn(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
  }

  // Preload per-ayah durations (for learning mode highlighting)
  useEffect(() => {
    if (!selectedSurah || ayahs.length === 0) {
      setAyahDurations([]);
      return;
    }

    let cancelled = false;

    async function loadDurations() {
      try {
        const durations = await Promise.all(
          ayahs.map(
            (ayah) =>
              new Promise((resolve) => {
                const audio = new Audio();
                audio.src = ayah.audioUrl;
                audio.addEventListener("loadedmetadata", () => {
                  resolve(audio.duration || 0);
                });
                audio.addEventListener("error", () => resolve(0));
              })
          )
        );
        if (!cancelled) {
          setAyahDurations(durations);
        }
      } catch {
        if (!cancelled) {
          setAyahDurations([]);
        }
      }
    }

    loadDurations();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurahIndex, surahs.length]);

  // ⭐ Auto-scroll the current ayah into view
  useEffect(() => {
    const el = ayahRefs.current[currentAyahIndex];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [currentAyahIndex]);

  // Practice mode: play one ayah (per-ayah MP3)
  function playAyah(index) {
    if (!selectedSurah) return;

    const ayah = ayahs[index];
    const audio = audioRef.current;
    if (!ayah || !audio) return;

    setCurrentAyahIndex(index);
    setIsUserTurn(false);

    audio.src = ayah.audioUrl;
    audio.play().catch(() => {});
  }

  function handleAudioEnded() {
    if (!selectedSurah) return;

    if (mode === "learning") {
      // Full surah finished – nothing else
      return;
    }

    if (mode === "practice") {
      setIsUserTurn(true);
    }
  }

  // While full audio plays, map currentTime → current ayah
  function handleTimeUpdate() {
    if (mode !== "learning") return;
    if (!audioRef.current || ayahDurations.length === 0) return;

    const t = audioRef.current.currentTime;
    let cumulative = 0;

    for (let i = 0; i < ayahDurations.length; i++) {
      cumulative += ayahDurations[i];
      if (t <= cumulative) {
        if (currentAyahIndex !== i) {
          setCurrentAyahIndex(i);
        }
        break;
      }
    }
  }

  // Learning mode: use full-surah MP3
  function startLearning() {
    if (!selectedSurah) return;
    const audio = audioRef.current;
    if (!audio) return;

    setIsUserTurn(false);
    setCurrentAyahIndex(0);

    audio.src = selectedSurah.fullAudioUrl;
    audio.play().catch(() => {});
  }

  // Practice mode: start from ayah 0
  function startPractice() {
    if (!selectedSurah) return;
    playAyah(0);
  }

  function nextAyahPractice() {
    if (!selectedSurah) return;
    setIsUserTurn(false);

    setCurrentAyahIndex((prev) => {
      const next = prev + 1;
      if (next < ayahs.length) {
        setTimeout(() => playAyah(next), 0);
        return next;
      }
      return prev;
    });
  }

  function pauseAudio() {
    if (audioRef.current) audioRef.current.pause();
  }

  // previous / next surah buttons
  function goToPreviousSurah() {
    setSelectedSurahIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function goToNextSurah() {
    setSelectedSurahIndex((prev) =>
      prev < surahs.length - 1 ? prev + 1 : prev
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <p>Loading surahs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "red" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!selectedSurah) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <p>No surah loaded.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif"
      }}
    >
      {/* HEADER */}
      <h1 style={{ textAlign: "center", marginBottom: 4, fontSize: "2.7rem" }}>
        Qur&apos;an Practice
      </h1>
      <p
        style={{
          textAlign: "center",
          marginTop: 0,
          fontSize: 14,
          opacity: 0.8
        }}
      >
        Learn and understand: full surah with translation and transliteration
        <br />
        Practice: ayah by ayah
      </p>

      {/* RECITER ROW */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          fontSize: 14
        }}
      >
        <span>Reciter:</span>
        <select
          value={reciter}
          onChange={(e) => setReciter(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 14 }}
        >
          <option value="1">Mishary Al-Afasy</option>
          <option value="2">Abu Bakr Al Shatri</option>
          <option value="3">Nasser Al Qatami</option>
          <option value="4">Yasser Al-Dosari</option>
          <option value="5">Hani Ar Rifai</option>
        </select>
      </div>

      {/* SURAH NAV BAR */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <button
          onClick={goToPreviousSurah}
          disabled={selectedSurahIndex === 0}
          style={{ minWidth: 110 }}
        >
          ← Previous
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "1.9rem" }}>{selectedSurah.arabicName}</div>
          <div style={{ fontSize: "0.95rem", opacity: 0.8 }}>
            Surah {selectedSurah.surahNumber}: {selectedSurah.name}
          </div>
        </div>

        <button
          onClick={goToNextSurah}
          disabled={selectedSurahIndex === surahs.length - 1}
          style={{ minWidth: 110 }}
        >
          Next →
        </button>
      </div>

      {/* CONTROLS CARD */}
      <div
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 10,
          background: "#151515",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10
        }}
      >
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("learning")}
            disabled={mode === "learning"}
          >
            Learning Mode
          </button>
          <button
            onClick={() => setMode("practice")}
            disabled={mode === "practice"}
          >
            Practice Mode
          </button>
        </div>

        {/* Play controls (depend on mode) */}
        <div style={{ display: "flex", gap: 8 }}>
          {mode === "learning" && (
            <>
              <button onClick={startLearning}>Play Surah</button>
              <button onClick={pauseAudio}>Pause</button>
            </>
          )}

          {mode === "practice" && (
            <>
              <button onClick={startPractice}>Start Practice</button>
              {isUserTurn && (
                <button onClick={nextAyahPractice}>Next Ayah</button>
              )}
            </>
          )}
        </div>

        {mode === "practice" && isUserTurn && (
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Your turn: recite this ayah, then press &quot;Next Ayah&quot;.
          </p>
        )}
      </div>

      {/* AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={handleTimeUpdate}
        style={{ display: "none" }}
      />

      {/* AYAH PANEL */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 10,
          background: "#181818",
          maxHeight: 420,
          overflowY: "auto"
        }}
      >
        {ayahs.map((ayah, idx) => {
          const highlightInLearning =
            mode === "learning" && idx === currentAyahIndex;
          const highlightInPractice =
            mode === "practice" && idx === currentAyahIndex;
          const isCurrent = highlightInLearning || highlightInPractice;

          return (
            <div
              key={ayah.number}
              ref={(el) => (ayahRefs.current[idx] = el)}  // ⭐ attach ref
              style={{
                padding: "8px 10px",
                marginBottom: 6,
                borderRadius: 8,
                background: isCurrent ? "#24315f" : "transparent",
                border: isCurrent
                  ? "1px solid #3f5bff"
                  : "1px solid transparent",
                textAlign: "right"
              }}
            >
              <div style={{ fontSize: "1.4rem" }}>{ayah.text_ar}</div>
              {ayah.english && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.8,
                    textAlign: "left",
                    marginTop: 4
                  }}
                >
                  {ayah.number}. {ayah.english}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}