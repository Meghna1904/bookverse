import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };

export async function openPdf(data: ArrayBuffer) {
  return pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
}

export function isPasswordError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "PasswordException"
  );
}
