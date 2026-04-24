# @skilldrunk/quotes

`quotes.skilldrunk.com` — Daily Dose. Günlük ilham.

## Endpoints
- `/` — günün sözü (deterministic + particle animation + Yeni İlham button)
- `/api/daily` — JSON, günün sözü (Istanbul midnight'a kadar aynı)
- `/api/random` — JSON, rastgele söz
- `/api/ai` — POST, Claude Haiku üretir (needs ANTHROPIC_API_KEY)

## DB
- `public.qt_quotes` — curated + AI + user_submitted
- `public.qt_daily_quote()` — doy % total deterministic pick
- `public.qt_random_quote()`
- `public.qt_featured_quotes()`

## Cowork kullanımı
Her sabah/akşam brief'ine şu linki koy:
```
https://quotes.skilldrunk.com
```
Istanbul midnight'a kadar aynı quote görünür, kullanıcı mobilden açar.
