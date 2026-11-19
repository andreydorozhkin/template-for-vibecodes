`main/` — маршрутизатор Edge Runtime из официального self-hosted набора Supabase (образ `supabase/edge-runtime:v1.77.9`). Контейнер `functions` вызывает его как `--main-service`, а код функций берёт из `supabase/functions/<имя>`.

Файлы здесь не редактируют под задачу приложения. Новая серверная логика — это новая функция в `supabase/functions/`.
