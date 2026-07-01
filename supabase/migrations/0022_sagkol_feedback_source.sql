-- Sağkol geri-bildirim kaynağı.
-- Her Sağkol kurulumu (enco, surucu, greenix, skimsoulfat, ...) kullanıcı istek/not'unu
-- POST /api/sagkol/feedback üzerinden merkezî sd_backlog'a gönderir. source='sagkol' ile
-- ayrışır; admin.skilldrunk.com/backlog?project=sagkol'da toplanır. Kurulum bilgisi tag'de: from:<install>.
alter type public.sd_backlog_source add value if not exists 'sagkol';
