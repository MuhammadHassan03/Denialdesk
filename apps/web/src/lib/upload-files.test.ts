import { describe, expect, it } from "vitest";
import { checkUploadFile } from "./upload-files";

const ONE_KILOBYTE = 1024;
const THIRTY_MEGABYTES = 30 * 1024 * 1024;

describe("checkUploadFile", () => {
  it("accepts an 835 file", () => {
    expect(checkUploadFile("remit_1102.835", ONE_KILOBYTE)).toEqual({ accepted: true });
  });

  it("accepts extensions in any case", () => {
    expect(checkUploadFile("EOB.PDF", ONE_KILOBYTE)).toEqual({ accepted: true });
  });

  it("names the wrong extension", () => {
    expect(checkUploadFile("claims.xlsx", ONE_KILOBYTE)).toEqual({
      accepted: false,
      billerMessage: "Denialdesk reads 835 files and EOB PDFs. This is a .xlsx file.",
    });
  });

  it("rejects a file with no extension", () => {
    expect(checkUploadFile("remit", ONE_KILOBYTE).accepted).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(checkUploadFile("remit.835", 0)).toEqual({
      accepted: false,
      billerMessage: "This file is empty.",
    });
  });

  it("rejects a file over the size limit", () => {
    expect(checkUploadFile("eob.pdf", THIRTY_MEGABYTES).accepted).toBe(false);
  });
});
