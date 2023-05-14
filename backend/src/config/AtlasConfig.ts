export namespace AtlasConfig {
  export const USERNAME: string | undefined = process.env.ATLAS_USERNAME;
  export const PASSWORD: string | undefined = process.env.ATLAS_PASSWORD;
  export const CLUSTER_URI: string | undefined = process.env.ATLAS_CLUSTER_URI;
}

export default AtlasConfig;
