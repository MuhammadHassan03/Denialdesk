// The browser's first check on a picked file (F2). The real check happens in processing.

export const MAX_FILES_PER_BATCH = 20;
export const MAX_FILE_SIZE_MB = 25;
const BYTES_PER_MB = 1024 * 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

export const ACCEPTED_EXTENSIONS: readonly string[] = [".835", ".edi", ".x12", ".txt", ".pdf"];

export type UploadFileCheck = { accepted: true } | { accepted: false; billerMessage: string };

function fileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return fileName.slice(lastDot).toLowerCase();
}

export function checkUploadFile(fileName: string, sizeBytes: number): UploadFileCheck {
  const extension = fileExtension(fileName);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    const shownExtension = extension === "" ? "file with no extension" : `${extension} file`;
    return {
      accepted: false,
      billerMessage: `Denialdesk reads 835 files and EOB PDFs. This is a ${shownExtension}.`,
    };
  }
  if (sizeBytes === 0) {
    return { accepted: false, billerMessage: "This file is empty." };
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      accepted: false,
      billerMessage: `This file is over ${MAX_FILE_SIZE_MB} MB. EOBs are usually much smaller; check you picked the right file.`,
    };
  }
  return { accepted: true };
}
