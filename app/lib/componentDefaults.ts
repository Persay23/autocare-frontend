export const COMPONENT_DEFAULTS: Record<string, { lifetimeKm: number; lifetimeYears: number }> = {
  Engine: { lifetimeKm: 150000, lifetimeYears: 10 },
  Transmission: { lifetimeKm: 180000, lifetimeYears: 10 },
  Brakes: { lifetimeKm: 50000, lifetimeYears: 5 },
  Suspension: { lifetimeKm: 100000, lifetimeYears: 8 },
  Electrical: { lifetimeKm: 120000, lifetimeYears: 8 },
  Cooling: { lifetimeKm: 80000, lifetimeYears: 6 },
  Fuel: { lifetimeKm: 80000, lifetimeYears: 6 },
  Exhaust: { lifetimeKm: 120000, lifetimeYears: 8 },
  Tyres: { lifetimeKm: 60000, lifetimeYears: 6 },
  Body: { lifetimeKm: 200000, lifetimeYears: 12 },
  Other: { lifetimeKm: 50000, lifetimeYears: 5 },
  // most common components that people would want to track as oil, oil filter, air filter, spark plug, battery, wipers, tires, brakes, ect
}
