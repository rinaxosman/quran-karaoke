// src/quranApi.js

const API_BASE = "https://quranapi.pages.dev/api";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

export async function fetchSurahWithAyahs(surahNo, reciterKey = "4") {
  // Default reciterKey = "4" → Yasser Al Dosari

  // 1) Chapter info (names + text)
  const chapter = await fetchJson(`${API_BASE}/${surahNo}.json`);

  const totalAyah = chapter.totalAyah;
  const arabicAyat = chapter.arabic1;
  const englishAyat = chapter.english;

  // 2) Full surah audio for this reciter (for learning mode)
  const chapterAudio = await fetchJson(`${API_BASE}/audio/${surahNo}.json`);
  const chapterReciterEntry = chapterAudio[reciterKey];
  const fullAudioUrl =
    chapterReciterEntry.originalUrl || chapterReciterEntry.url;

  // 3) Per-ayah audio (for practice mode)
  const ayahs = await Promise.all(
    Array.from({ length: totalAyah }, async (_, i) => {
      const ayahNo = i + 1;

      const audioData = await fetchJson(
        `${API_BASE}/audio/${surahNo}/${ayahNo}.json`
      );

      const reciterEntry = audioData[reciterKey];
      const audioUrl = reciterEntry.originalUrl || reciterEntry.url;

      return {
        number: ayahNo,
        text_ar: arabicAyat[i],
        english: englishAyat?.[i],
        audioUrl
      };
    })
  );

  return {
    surahNumber: chapter.surahNo,
    name: chapter.surahName,
    arabicName: chapter.surahNameArabic,
    fullAudioUrl, // ⭐ single file for learning mode
    ayahs
  };
}

export async function fetchSelectedSurahs(reciterKey = "4") {
  // Surah Al-Fatihah + Surahs Ad-Duhaa → An-Naas
  const nums = [1, ...Array.from({ length: 114 - 93 + 1 }, (_, i) => 93 + i)];

  return Promise.all(nums.map((n) => fetchSurahWithAyahs(n, reciterKey)));
}
