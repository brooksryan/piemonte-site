import { z } from 'zod';

export const RegionSchema = z.enum(['langhe', 'finale-arc', 'sestri-arc', 'city', 'other']);
export type Region = z.infer<typeof RegionSchema>;

export const EntityTypeSchema = z.enum([
  'town', 'lodging', 'restaurant', 'winery', 'beach',
  'map', 'drive', 'cultural-site', 'region-narrative',
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

const baseFields = {
  slug: z.string().min(1),
  name: z.string().min(1),
  region: RegionSchema,
  sourceLocator: z.string().min(1),
};

export const TownSchema = z.object({
  ...baseFields,
  type: z.literal('town'),
  blurb: z.string(),
  driveTimeMin: z.number().optional(),
  mapPin: z.object({ lat: z.number(), lon: z.number() }).optional(),
  placeId: z.string().optional(),
  url: z.string().optional(),
});

export const LodgingSchema = z.object({
  ...baseFields,
  type: z.literal('lodging'),
  base: z.enum(['milan', 'alba-langhe', 'sestri', 'finale', 'mxp', 'turin']),
  platform: z.enum(['direct', 'booking', 'airbnb']),
  url: z.string().optional(),
  address: z.string().optional(),
  placeId: z.string().optional(),
  rateBand: z.string(),
  why: z.string(),
});

export const RestaurantSchema = z.object({
  ...baseFields,
  type: z.literal('restaurant'),
  town: z.string(),
  register: z.string(),
  placeId: z.string().optional(),
  url: z.string().optional(),
  blurb: z.string(),
});

export const WinerySchema = z.object({
  ...baseFields,
  type: z.literal('winery'),
  town: z.string(),
  visitPolicy: z.string(),
  placeId: z.string().optional(),
  url: z.string().optional(),
  blurb: z.string(),
});

export const BeachSchema = z.object({
  ...baseFields,
  type: z.literal('beach'),
  town: z.string(),
  character: z.string(),
  driveTimeMin: z.number().optional(),
  placeId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageCredit: z.string().optional(),
  blurb: z.string(),
});

export const MapSchema = z.object({
  ...baseFields,
  type: z.literal('map'),
  svgPath: z.string(),
  kind: z.enum(['route', 'utility-langhe', 'utility-finale']),
  blurbs: z.array(z.object({ index: z.number(), title: z.string(), body: z.string() })),
});

export const DriveSchema = z.object({
  ...baseFields,
  type: z.literal('drive'),
  from: z.string(),
  to: z.string(),
  durationMin: z.number(),
});

export const CulturalSiteSchema = z.object({
  ...baseFields,
  type: z.literal('cultural-site'),
  town: z.string(),
  category: z.string(),
  placeId: z.string().optional(),
  url: z.string().optional(),
  blurb: z.string(),
});

export const RegionNarrativeSchema = z.object({
  ...baseFields,
  type: z.literal('region-narrative'),
  body: z.string(),
  anchors: z.array(z.object({
    name: z.string(),
    blurb: z.string(),
    placeId: z.string().optional(),
    url: z.string().optional(),
  })),
});

export const SeedSchema = z.discriminatedUnion('type', [
  TownSchema, LodgingSchema, RestaurantSchema, WinerySchema, BeachSchema,
  MapSchema, DriveSchema, CulturalSiteSchema, RegionNarrativeSchema,
]);
export type Seed = z.infer<typeof SeedSchema>;

export const SearchRecordSchema = z.object({
  slug: z.string(),
  type: EntityTypeSchema,
  name: z.string(),
  town: z.string().optional(),
  region: RegionSchema.optional(),
  tags: z.array(z.string()),
});
export type SearchRecord = z.infer<typeof SearchRecordSchema>;
