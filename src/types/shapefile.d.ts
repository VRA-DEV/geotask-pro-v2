declare module "shapefile" {
  interface ReadOptions {
    encoding?: string;
  }

  interface Source {
    read(): Promise<{ done: boolean; value: GeoJSON.Feature | null }>;
  }

  export function open(
    shp: string | Buffer,
    dbf?: string | Buffer | null,
    options?: ReadOptions,
  ): Promise<Source>;

  export function read(
    shp: string | Buffer,
    dbf?: string | Buffer | null,
    options?: ReadOptions,
  ): Promise<GeoJSON.FeatureCollection>;
}
