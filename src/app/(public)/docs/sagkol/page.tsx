import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sağkol — skilldrunk docs",
  description:
    "Sağkol: onay-kapılı, DB-bağımsız, yerleşik AI copilot skill'i. Opsiyonlar, kurulum (Claude Code + Codex) ve geri-bildirim döngüsü.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export default function SagkolDocsPage() {
  return (
    <>
      <h1>Sağkol</h1>
      <p>
        Sağkol, bir web uygulamasının içine gömülü, sağ panelde yaşayan domain-bilgili bir AI copilot
        kalıbıdır. Kullanıcının kendi verisini araçlarla sorgular (ezberden değil), what-if simüle eder
        (yazmadan), host UI&apos;ı sürer, ve <strong>onay-kapılı</strong> modda değişiklik önerir ama
        kullanıcı onaylayana kadar <strong>asla yazmaz</strong>. Motor domain- ve DB-bağımsızdır
        (<code>@sagkol/core</code> → <code>runAgentLoop</code>); her proje iki ince port yazar:
        <code>StorePort</code> (kalıcılık) + <code>SagkolAdapter</code> (domain).
      </p>

      <h2>Opsiyon matrisi</h2>
      <p>Standart set (rol-yetki · onay kapısı · audit · hafıza · what-if · ayar yüzeyi) sabittir; bunlar üstüne kurulumda seçilir:</p>
      <table>
        <thead>
          <tr><th>Opsiyon</th><th>Değerler (varsayılan kalın)</th><th>Not</th></tr>
        </thead>
        <tbody>
          <tr><td>Mod</td><td><strong>approval-gated</strong> · readonly</td><td>readonly = yalnız sorgu+öğret; yazma yok.</td></tr>
          <tr><td>Maskeleme (KVKK)</td><td>on (hassas veride <strong>on</strong>) · off</td><td>Model yetkisiz alanı (TC/maaş) hiç görmez.</td></tr>
          <tr><td>Kanallar</td><td><strong>panel dock</strong> · +Telegram · +öğretmen modu</td><td>Aynı motor Telegram&apos;a; öğretmen = adım-adım.</td></tr>
          <tr><td>Ayar yüzeyi</td><td><strong>on</strong> · off</td><td>ConfigPort + step-up OTP (tehlikeli toggle).</td></tr>
          <tr><td>Autofix</td><td><strong>off</strong> · on</td><td>Bulgu → CI → ajan düzeltir → PR.</td></tr>
          <tr><td>Geri-bildirim</td><td><strong>on</strong> · off</td><td>Sağkol&apos;u besle → merkezî backlog.</td></tr>
          <tr><td>Stack</td><td><strong>Next.js</strong> · Flask/Python · diğer</td><td>Next: core+SSE. Flask: NDJSON + Python loop.</td></tr>
        </tbody>
      </table>

      <h2>Kurulum</h2>
      <p><strong>Claude Code</strong> — bir kez (makine başına):</p>
      <Code>{`claude plugin marketplace add LuciFeRADoNiS/sagkol-plugin
claude plugin install sagkol@sagkol-marketplace`}</Code>
      <p>Sonra her projede, dizininde: <code>&quot;sağkol kur&quot;</code> de. Stack tespiti → kısa domain röportajı → SSE route + onay-kapılı loop + StorePort + rol matrisi + panel + ayar yüzeyi üretilir.</p>
      <p>
        <strong>Codex / diğer ajanlar</strong> — plugin kökündeki ajan-nötr <code>AGENTS.md</code> spec&apos;ini
        okur ve aynı doktrini uygular (değişmez kurallar + opsiyon matrisi + kurulum akışı + doğrulama).
        Next dışı bir stack&apos;te (ör. Flask) deseni elle taşır.
      </p>

      <h2>Geri-bildirim döngüsü (Sağkol&apos;u besle)</h2>
      <p>
        Kurulan her Sağkol, kullanıcının istek/öneri/eksik/hata bildirebileceği bir hatla gelir. Bunlar
        merkezî backlog&apos;a akar; iyi olanlar skill&apos;in sonraki sürümüne katılır — kendini besleyen döngü.
        Araç <code>submit_feedback</code> onay-kapılıdır (AI tek başına göndermez).
      </p>
      <Code>{`POST https://skilldrunk.com/api/sagkol/feedback
{ "project": "<install>", "title": "...", "body": "...", "kind": "request|suggestion|bug|gap|note" }`}</Code>
      <p>
        Toplanma noktası:{" "}
        <Link href="https://admin.skilldrunk.com/backlog?project=sagkol" className="underline">
          admin.skilldrunk.com/backlog?project=sagkol
        </Link>
        .
      </p>

      <h2>Kaynaklar</h2>
      <ul>
        <li>Plugin marketplace: <code>github.com/LuciFeRADoNiS/sagkol-plugin</code></li>
        <li>Motor: <code>@sagkol/core</code> — <code>github.com/LuciFeRADoNiS/sagkol-core</code></li>
        <li>
          Canlı vitrin:{" "}
          <Link href="https://sagkol.skilldrunk.com" className="underline">sagkol.skilldrunk.com</Link>
        </li>
      </ul>
    </>
  );
}
