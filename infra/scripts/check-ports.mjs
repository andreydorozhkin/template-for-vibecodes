// Reads `docker compose config --format json` from stdin and fails if any service
// publishes a port on an address other than 127.0.0.1.
// Public traffic must enter only through SafeLine (host network, ports 80/443).
let input = "";
for await (const chunk of process.stdin) input += chunk;

const { services } = JSON.parse(input);
const exposed = [];
for (const [name, service] of Object.entries(services)) {
  for (const port of service.ports ?? []) {
    if (port.host_ip !== "127.0.0.1") {
      exposed.push(`${name}: ${port.host_ip ?? "0.0.0.0"}:${port.published}->${port.target}`);
    }
  }
}

if (exposed.length > 0) {
  console.error("Ports published outside 127.0.0.1:\n" + exposed.join("\n"));
  process.exit(1);
}
console.log(`ok: ${Object.keys(services).length} services, all published ports on 127.0.0.1`);
