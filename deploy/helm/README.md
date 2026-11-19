# Пример Helm-чарта

Это пример, а не основная часть шаблона. Локальная разработка и проверка идут через `infra/docker-compose.yml`. Чарт показывает, как тот же контейнер Next.js можно описать для Kubernetes. Supabase сюда не входит.

Перед установкой соберите образ из `app/Dockerfile` и положите ключи в values или, лучше, в Secret. В репозиторий заполненные ключи не коммитят.

```bash
helm lint deploy/helm/app
helm template example deploy/helm/app
```
