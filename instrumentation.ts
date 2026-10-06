/**
 * Runs once when the server starts: discovers skills and logs what was found,
 * so a missing or empty skill is visible in the terminal right away.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { loadSkills } = await import("./lib/skills");
  const { modelMode } = await import("./lib/model");

  const skills = await loadSkills();
  const list = skills.map((s) => `${s.id}${s.status === "ready" ? "" : ` (${s.status})`}`).join(", ") || "none";
  console.log(`[skills] found ${skills.length}: ${list}`);
  console.log(`[model] mode: ${modelMode() === "live" ? "CreateAI (token set)" : "mock (no CREATEAI_TOKEN)"}`);
}
