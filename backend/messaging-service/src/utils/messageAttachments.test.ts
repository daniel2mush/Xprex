import test from "node:test";
import assert from "node:assert/strict";
import {
  getMessagePreview,
  normalizeMessageMediaIds,
} from "./messageAttachments";

test("normalizeMessageMediaIds deduplicates, drops blanks, and caps the list", () => {
  assert.deepEqual(
    normalizeMessageMediaIds([
      "media-1",
      "",
      "media-2",
      "media-1",
      "media-3",
      "media-4",
      "media-5",
    ]),
    ["media-1", "media-2", "media-3", "media-4"],
  );
});

test("getMessagePreview prefers text when content exists", () => {
  assert.equal(getMessagePreview("  hello there  ", 2), "hello there");
});

test("getMessagePreview falls back to attachment copy when text is empty", () => {
  assert.equal(getMessagePreview("", 1), "Sent an attachment");
  assert.equal(getMessagePreview("", 3), "Sent 3 attachments");
  assert.equal(getMessagePreview("", 0), "");
});
