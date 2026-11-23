// Reads `docker compose config --format json` from stdin and fails if any service
// publishes a port on a public address. Allowed binds: 127.0.0.1 and RFC1918.
// SafeLine 9.4.3+ rejects 127.0.0.1 as an upstream, so production uses a private
// address. Public traffic still enters only through SafeLine on 80/443.
let input = "";
for await (const chunk of process.stdin) input += chunk;

function isPrivate(host) {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

const { services } = JSON.parse(input);
const exposed = [];
for (const [name, service] of Object.entries(services)) {
  for (const port of service.ports ?? []) {
    const host = port.host_ip ?? "0.0.0.0";
    if (host !== "127.0.0.1" && !isPrivate(host)) {
      exposed.push(`${name}: ${host}:${port.published}->${port.target}`);
    }
  }
}

if (exposed.length > 0) {
  console.error("Ports published on a public address:\n" + exposed.join("\n"));
  process.exit(1);
}
console.log(`ok: ${Object.keys(services).length} services, published ports are loopback or private`);
