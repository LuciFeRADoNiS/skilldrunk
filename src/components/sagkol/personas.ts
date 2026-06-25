/**
 * Pantheon personaları — Sağkol panelinin "yüzü". Görsel avatar (emoji) + renk + selamlama.
 * Hepsi aynı ZeuX motoruyla çalışır; persona sadece avatar + accent + açılış tonunu değiştirir.
 * Kullanıcı panelden seçer.
 */

export type Persona = {
  id: string;
  name: string;
  title: string;
  avatar: string; // emoji
  accent: string; // hex
  greeting: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "zeux",
    name: "ZeuX",
    title: "Ekosistem Koordinatörü",
    avatar: "👑",
    accent: "#f0a030",
    greeting:
      "Selam Özgür. tÖdÜs panonu yönetebilirim — sor, filtrele, simüle et, kart değişikliği öner. Strateji bende, implementasyon sende.",
  },
  {
    id: "atlas",
    name: "Atlas",
    title: "Yük & Operasyon",
    avatar: "🗺️",
    accent: "#4dabf7",
    greeting:
      "Atlas burada. Operasyon yükünü taşırım — hangi kolonlar dolu, kim ne kadar yüklü, neyi taşımalı? Sor.",
  },
  {
    id: "hermes",
    name: "Hermes",
    title: "Hız & Haberci",
    avatar: "🪽",
    accent: "#9775fa",
    greeting:
      "Hermes. Hızlı haber: yaklaşan toplantılar, deadline'lar, acil P0'lar. Neyi öne çıkarayım?",
  },
  {
    id: "apollo",
    name: "Apollo",
    title: "İçgörü & Analiz",
    avatar: "☀️",
    accent: "#ffd43b",
    greeting:
      "Apollo. Net görürüm — board istatistikleri, what-if simülasyonları, kategori analizleri. Hangi açıyı aydınlatayım?",
  },
  {
    id: "mnemosyne",
    name: "Mnemosyne",
    title: "Hafıza & Notlar",
    avatar: "🧠",
    accent: "#51cf66",
    greeting:
      "Mnemosyne. Hafıza bende — el yazısı notlarından (oznotes) ne geçtiğini bulurum. Hangi konuyu hatırlatayım?",
  },
];

export const DEFAULT_PERSONA = PERSONAS[0];

export function getPersona(id: string | null | undefined): Persona {
  return PERSONAS.find((p) => p.id === id) ?? DEFAULT_PERSONA;
}
