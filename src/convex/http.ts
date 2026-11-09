import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Private PDF streaming. A document is only served when the caller presents a
 * short-lived grant that was issued to a reader with access, so copying a
 * storage URL or document id is not enough to read someone's private library.
 */
http.route({
  path: "/pdf",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400 });
    const grant = await ctx.runQuery(internal.pdf.resolveGrant, { token });
    if (!grant) return new Response("This document link has expired.", { status: 403 });
    const file = await ctx.storage.get(grant.storageId);
    if (!file) return new Response("File not found", { status: 404 });
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${grant.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;
