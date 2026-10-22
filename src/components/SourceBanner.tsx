"use client";

import Link from "next/link";
import { AlertTriangle, Database, ListTree, RefreshCw, ShieldAlert } from "lucide-react";
import { useAppState } from "./AppState";
import { Badge, Button } from "./ui";

/**
 * Kaynak erişim durumunu özetler. kamuilan.sbb.gov.tr IP engeli verdiğinde
 * tüm listenin nasıl içe aktarılacağını adım adım anlatır.
 */
export function SourceBanner({ compact = false }: { compact?: boolean }) {
  const { data, syncing, sync } = useAppState();
  const logs = data?.logs ?? [];
  const sbb = logs.find((l) => /kamuilan\.sbb\.gov\.tr/i.test(l.source));
  const search = logs.find((l) => /tam liste/i.test(l.source));
  const blocked = sbb?.status === "blocked" || search?.status === "blocked";
  const liveCount = data?.stats.liveCount ?? 0;
  const imported = (data?.jobs ?? []).filter((j) => j.source === "import" || j.source === "sbb").length;

  if (!blocked) {
    if (compact) return null;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <Database className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-[12.5px] text-emerald-900">
          Kaynaklar erişilebilir · havuzda <b>{liveCount}</b> canlı ilan var.
        </p>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" icon={<RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />} disabled={syncing} onClick={() => void sync(0)}>
            Yeniden tara
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-amber-300 bg-amber-50">
      <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-amber-900">
            kamuilan.sbb.gov.tr bu sunucunun IP&apos;sini engelliyor
            <Badge tone="amber">HTTP 403 · Access Restricted</Badge>
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/80">
            Portal yurt dışı sunucularına kapalı olduğu için liste doğrudan çekilemiyor. Şu an havuzda <b>{liveCount}</b> canlı ilan var
            {imported ? ` (bunun ${imported} tanesi içe aktarıldı)` : ""}. Portalda görünen <b>tüm ilanları</b> (ör. 101 ilan) eklemenin en hızlı yolu listeyi
            yapıştırmak:
          </p>
          <ol className="mt-2 grid gap-1 text-[12.5px] text-amber-900/85 sm:grid-cols-2">
            <li>1. Tarayıcında <b>kamuilan.sbb.gov.tr</b> adresini aç.</li>
            <li>2. <b>Ctrl+U</b> (kaynağı görüntüle) → <b>Ctrl+A</b> → <b>Ctrl+C</b>.</li>
            <li>3. Aşağıdaki butona bas ve içeriği yapıştır.</li>
            <li>4. &quot;Tümünü içe aktar&quot; → ilanlar puanlanmış olarak listelenir.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/yapistir?mod=liste">
              <Button size="sm" icon={<ListTree className="h-3.5 w-3.5" />}>
                Listeyi yapıştır &amp; içe aktar
              </Button>
            </Link>
            <Button size="sm" variant="outline" icon={<RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />} disabled={syncing} onClick={() => void sync(0)}>
              Tekrar dene
            </Button>
            <Link href="/yapistir?mod=tek">
              <Button size="sm" variant="ghost" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                Tek ilan çözümle
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <p className="border-t border-amber-200 bg-amber-100/60 px-4 py-2 text-[11.5px] leading-relaxed text-amber-900/80">
        Uygulama Türkiye&apos;de bir sunucuda çalıştırıldığında (TR IP) SBB portalı ve Kariyer Kapısı tam liste ucu otomatik olarak açılır; o zaman bu adıma gerek
        kalmaz. Ayrıca canlı yedek kaynak olarak Kariyer Kapısı&apos;nın resmî RSS beslemesi kullanılıyor.
      </p>
    </div>
  );
}
