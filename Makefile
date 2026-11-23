.PHONY: check-deps stories-seed init

check-deps:
	@ok=1; \
	command -v node >/dev/null 2>&1 || { echo "нужен Node.js (в README — Node.js 24+)"; ok=0; }; \
	command -v npm >/dev/null 2>&1 || { echo "нужен npm"; ok=0; }; \
	command -v docker >/dev/null 2>&1 || { echo "нужен Docker"; ok=0; }; \
	docker compose version >/dev/null 2>&1 || { echo "нужен Docker Compose v2 (\`docker compose\`)"; ok=0; }; \
	if [ "$$ok" -ne 1 ]; then exit 1; fi; \
	echo "deps ok: node $$(node -v), docker compose ok"

stories-seed:
	node docs/stories/seed-for-new-service.mjs
	npm run stories:board

init: check-deps
	npm run keys
	npm run up
	$(MAKE) stories-seed