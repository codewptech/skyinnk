import assert from "node:assert/strict";
import { test } from "node:test";
import { validatePublicCatalogue } from "../shared/public-content.ts";
import { publicCatalogueFixture } from "./fixtures/public-catalogue.mjs";

const impossible = [
  "2026-02-30T00:00:00Z",
  "2026-02-31T11:00:00.000Z",
  "2025-02-29T09:30:00+05:30",
  "1900-02-29T00:00:00Z",
  "2026-04-31T13:45:00Z",
  "2026-11-31T00:00:00Z",
];
const real = [
  "2024-02-29T00:00:00Z",
  "2000-02-29T23:59:59.000Z",
  "2026-11-24T17:00:00+05:30",
  "2026-01-31T12:34:56.123Z",
];

test("public source validator rejects impossible review dates instead of Date.parse rollover", () => {
  assert.ok(Number.isFinite(Date.parse("2026-02-30T00:00:00Z")),
    "the regression tests the real native date-rollover behavior");
  for (const invalid of impossible) {
    const value = publicCatalogueFixture();
    value.courses[0].publication.reviewedAt = invalid;
    assert.throws(
      () => validatePublicCatalogue(value),
      /Public content:.*ISO review timestamp/,
      "must reject impossible course review date " + invalid,
    );
  }
});

test("the same calendar rule protects lesson and reviewed-resource publication metadata", () => {
  const value = publicCatalogueFixture();
  const lesson = value.courses[0].modules[0].lessons[0];
  lesson.publication.reviewedAt = "2026-02-30T00:00:00Z";
  assert.throws(() => validatePublicCatalogue(value), /ISO review timestamp/);

  const valid = publicCatalogueFixture();
  const target = valid.courses[0].modules[1].lessons[0];
  target.resources = [{
    key: "date-fixture-resource",
    title: "Approved source fixture",
    url: "/resources/public/sample.txt",
    type: "TXT",
    sizeBytes: 4,
    publication: { ...target.publication, reviewedAt: "2026-04-31T10:00:00Z" },
  }];
  assert.throws(() => validatePublicCatalogue(valid), /ISO review timestamp/);
});

test("valid leap days and ISO timezone offsets remain accepted with no publication-schema change", () => {
  for (const timestamp of real) {
    const value = publicCatalogueFixture();
    value.courses[0].publication.reviewedAt = timestamp;
    value.courses[0].modules[0].lessons[0].publication.reviewedAt = timestamp;
    assert.doesNotThrow(
      () => validatePublicCatalogue(value),
      "valid ISO review timestamp: " + timestamp,
    );
  }
  assert.doesNotThrow(() => validatePublicCatalogue(publicCatalogueFixture()));
});
