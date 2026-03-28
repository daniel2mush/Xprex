import test from "node:test";
import assert from "node:assert/strict";
import {
  isReportReason,
  isReportStatus,
  normalizeReportDetails,
} from "./reporting";

test("isReportReason accepts supported reasons only", () => {
  assert.equal(isReportReason("SPAM"), true);
  assert.equal(isReportReason("OTHER"), true);
  assert.equal(isReportReason("PHISHING"), false);
});

test("isReportStatus accepts supported statuses only", () => {
  assert.equal(isReportStatus("OPEN"), true);
  assert.equal(isReportStatus("REVIEWED"), true);
  assert.equal(isReportStatus("ARCHIVED"), false);
});

test("normalizeReportDetails trims user input and clears empty values", () => {
  assert.equal(normalizeReportDetails("  repeated harassment  "), "repeated harassment");
  assert.equal(normalizeReportDetails("   "), null);
  assert.equal(normalizeReportDetails(undefined), null);
});
