/** Serverseitige Zeitzone: Berichte, Wochen und Cron-Logik rechnen in deutscher Zeit. */
export async function register() {
  if (!process.env.TZ) process.env.TZ = "Europe/Berlin";
}
