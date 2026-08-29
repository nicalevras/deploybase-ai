export type OAuthProviderId = "google" | "github" | "huggingface";

export type OAuthAvailability = Record<OAuthProviderId, boolean>;

type Environment = Record<string, string | undefined>;

export function getOAuthAvailability(
  environment: Environment = process.env,
): OAuthAvailability {
  return {
    google: Boolean(
      environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET,
    ),
    github: Boolean(
      environment.GITHUB_CLIENT_ID && environment.GITHUB_CLIENT_SECRET,
    ),
    huggingface: Boolean(
      environment.HUGGINGFACE_CLIENT_ID &&
        environment.HUGGINGFACE_CLIENT_SECRET,
    ),
  };
}
