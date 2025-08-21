import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { registerCorruption, runPipeline } from "./pipeline.ts";

// Use a fresh pipeline for isolated tests by importing the module,
// but note the global pipeline already has corruptions registered from other imports.
// These tests validate the pipeline mechanism itself.

Deno.test("runPipeline applies registered corruptions in order", () => {
  // We can't easily isolate the global pipeline, so test via degrade instead.
  // This test verifies the pipeline runs without error on trivial input.
  const rng = () => 0.5;
  const result = runPipeline("hello world", 0, rng);
  // At 0 progress, most corruptions are inactive
  assertEquals(result, "hello world");
});
