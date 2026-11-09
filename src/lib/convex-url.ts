/**
 * The deployment that owns the private reading room and its PIN credentials.
 *
 * The preview environment and some published builds have resolved different
 * `VITE_CONVEX_URL` values. The room must always talk to the deployment where
 * the readers were provisioned, otherwise a valid PIN is rejected at the door.
 * Update this URL only if the room is deliberately moved to another deployment.
 */
export const CONVEX_URL = "https://warmhearted-mastiff-926.convex.cloud";

export const CONVEX_SITE_URL = CONVEX_URL.replace(
  /\.convex\.cloud$/,
  ".convex.site",
);
