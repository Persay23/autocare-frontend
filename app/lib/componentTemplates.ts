export interface ComponentPreset {
  id: string
  name: string
  componentType: string
  description: string
  defaultLifetimeKm: number
  defaultLifetimeYears: number
}

export const COMPONENT_PRESETS: ComponentPreset[] = [
  // ENGINE
  { id: 'engine-oil',           name: 'Engine Oil',            componentType: 'Engine',       description: 'Lubricates engine internals',            defaultLifetimeKm: 15000,  defaultLifetimeYears: 1  },
  { id: 'oil-filter',           name: 'Oil Filter',            componentType: 'Engine',       description: 'Filters oil contaminants',               defaultLifetimeKm: 15000,  defaultLifetimeYears: 1  },
  { id: 'air-filter',           name: 'Air Filter',            componentType: 'Engine',       description: 'Filters intake air for combustion',      defaultLifetimeKm: 30000,  defaultLifetimeYears: 2  },
  { id: 'spark-plugs',          name: 'Spark Plugs',           componentType: 'Engine',       description: 'Ignites the fuel-air mixture',           defaultLifetimeKm: 60000,  defaultLifetimeYears: 4  },
  { id: 'timing-belt',          name: 'Timing Belt',           componentType: 'Engine',       description: 'Synchronises engine valves',             defaultLifetimeKm: 100000, defaultLifetimeYears: 5  },
  { id: 'timing-chain',         name: 'Timing Chain',          componentType: 'Engine',       description: 'Metal chain variant of timing belt',     defaultLifetimeKm: 200000, defaultLifetimeYears: 12 },
  { id: 'engine-mounts',        name: 'Engine Mounts',         componentType: 'Engine',       description: 'Secures engine to chassis',              defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'valve-cover-gasket',   name: 'Valve Cover Gasket',    componentType: 'Engine',       description: 'Seals the valve cover',                  defaultLifetimeKm: 100000, defaultLifetimeYears: 8  },
  { id: 'pcv-valve',            name: 'PCV Valve',             componentType: 'Engine',       description: 'Controls crankcase ventilation',         defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'ignition-coils',       name: 'Ignition Coils',        componentType: 'Engine',       description: 'Converts voltage to spark energy',       defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },

  // TRANSMISSION
  { id: 'gearbox',              name: 'Gearbox',               componentType: 'Transmission', description: 'Main gear changing mechanism',           defaultLifetimeKm: 200000, defaultLifetimeYears: 15 },
  { id: 'transmission-fluid',   name: 'Transmission Fluid',    componentType: 'Transmission', description: 'Lubricates gearbox internals',           defaultLifetimeKm: 60000,  defaultLifetimeYears: 4  },
  { id: 'clutch-kit',           name: 'Clutch Kit',            componentType: 'Transmission', description: 'Manual gearbox clutch assembly',         defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'cv-joints',            name: 'CV Joints',             componentType: 'Transmission', description: 'Driveshaft constant velocity joints',    defaultLifetimeKm: 120000, defaultLifetimeYears: 8  },
  { id: 'drive-shaft',          name: 'Drive Shaft',           componentType: 'Transmission', description: 'Transfers power to wheels',              defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },

  // BRAKES
  { id: 'front-brake-pads',     name: 'Front Brake Pads',      componentType: 'Brakes',       description: 'Friction pads for front discs',          defaultLifetimeKm: 40000,  defaultLifetimeYears: 3  },
  { id: 'rear-brake-pads',      name: 'Rear Brake Pads',       componentType: 'Brakes',       description: 'Friction pads for rear discs',           defaultLifetimeKm: 60000,  defaultLifetimeYears: 4  },
  { id: 'front-brake-discs',    name: 'Front Brake Discs',     componentType: 'Brakes',       description: 'Front braking rotors',                   defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'rear-brake-discs',     name: 'Rear Brake Discs',      componentType: 'Brakes',       description: 'Rear braking rotors',                    defaultLifetimeKm: 100000, defaultLifetimeYears: 6  },
  { id: 'brake-fluid',          name: 'Brake Fluid',           componentType: 'Brakes',       description: 'Hydraulic fluid for braking system',     defaultLifetimeKm: 30000,  defaultLifetimeYears: 2  },
  { id: 'brake-calipers',       name: 'Brake Calipers',        componentType: 'Brakes',       description: 'Clamps pads onto brake discs',           defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'handbrake-cable',      name: 'Handbrake Cable',       componentType: 'Brakes',       description: 'Mechanical parking brake cable',         defaultLifetimeKm: 100000, defaultLifetimeYears: 8  },
  { id: 'abs-sensor',           name: 'ABS Sensor',            componentType: 'Brakes',       description: 'Wheel speed sensor for ABS system',      defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },

  // SUSPENSION
  { id: 'front-shocks',         name: 'Front Shock Absorbers', componentType: 'Suspension',   description: 'Dampens front wheel movement',           defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'rear-shocks',          name: 'Rear Shock Absorbers',  componentType: 'Suspension',   description: 'Dampens rear wheel movement',            defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'coil-springs',         name: 'Coil Springs',          componentType: 'Suspension',   description: 'Vehicle suspension springs',             defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'control-arms',         name: 'Control Arms',          componentType: 'Suspension',   description: 'Links suspension to chassis',            defaultLifetimeKm: 120000, defaultLifetimeYears: 8  },
  { id: 'ball-joints',          name: 'Ball Joints',           componentType: 'Suspension',   description: 'Pivoting joints for steering',           defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'tie-rod-ends',         name: 'Tie Rod Ends',          componentType: 'Suspension',   description: 'Steering linkage end joints',            defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'sway-bar-links',       name: 'Sway Bar Links',        componentType: 'Suspension',   description: 'Connects stabilizer bar to suspension',  defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'wheel-bearings',       name: 'Wheel Bearings',        componentType: 'Suspension',   description: 'Allow wheels to rotate smoothly',        defaultLifetimeKm: 120000, defaultLifetimeYears: 8  },
  { id: 'steering-rack',        name: 'Steering Rack',         componentType: 'Suspension',   description: 'Converts steering input to wheel angle',  defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },

  // ELECTRICAL
  { id: 'battery',              name: 'Battery',               componentType: 'Electrical',   description: 'Stores and supplies electrical power',   defaultLifetimeKm: 60000,  defaultLifetimeYears: 4  },
  { id: 'alternator',           name: 'Alternator',            componentType: 'Electrical',   description: 'Generates electricity while running',    defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'starter-motor',        name: 'Starter Motor',         componentType: 'Electrical',   description: 'Cranks the engine on startup',           defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'fuse-box',             name: 'Fuse Box',              componentType: 'Electrical',   description: 'Protects all electrical circuits',       defaultLifetimeKm: 200000, defaultLifetimeYears: 15 },

  // COOLING
  { id: 'engine-coolant',       name: 'Engine Coolant',        componentType: 'Cooling',      description: 'Regulates engine temperature',           defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'radiator',             name: 'Radiator',              componentType: 'Cooling',      description: 'Dissipates engine heat',                 defaultLifetimeKm: 150000, defaultLifetimeYears: 12 },
  { id: 'water-pump',           name: 'Water Pump',            componentType: 'Cooling',      description: 'Circulates coolant through engine',      defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'thermostat',           name: 'Thermostat',            componentType: 'Cooling',      description: 'Regulates coolant flow by temperature',  defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'radiator-hoses',       name: 'Radiator Hoses',        componentType: 'Cooling',      description: 'Carry coolant to and from radiator',     defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'cabin-air-filter',     name: 'Cabin Air Filter',      componentType: 'Cooling',      description: 'Filters air entering passenger cabin',   defaultLifetimeKm: 20000,  defaultLifetimeYears: 1  },

  // FUEL
  { id: 'fuel-filter',          name: 'Fuel Filter',           componentType: 'Fuel',         description: 'Removes impurities from fuel',           defaultLifetimeKm: 40000,  defaultLifetimeYears: 3  },
  { id: 'fuel-pump',            name: 'Fuel Pump',             componentType: 'Fuel',         description: 'Delivers fuel from tank to engine',      defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'fuel-injectors',       name: 'Fuel Injectors',        componentType: 'Fuel',         description: 'Precisely injects fuel into cylinders',  defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'fuel-tank',            name: 'Fuel Tank',             componentType: 'Fuel',         description: 'Stores the vehicle fuel supply',         defaultLifetimeKm: 200000, defaultLifetimeYears: 15 },

  // EXHAUST
  { id: 'exhaust-system',       name: 'Exhaust System',        componentType: 'Exhaust',      description: 'Routes exhaust gases from engine',       defaultLifetimeKm: 120000, defaultLifetimeYears: 8  },
  { id: 'catalytic-converter',  name: 'Catalytic Converter',   componentType: 'Exhaust',      description: 'Reduces harmful exhaust emissions',      defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },
  { id: 'muffler',              name: 'Muffler',               componentType: 'Exhaust',      description: 'Reduces exhaust noise level',            defaultLifetimeKm: 100000, defaultLifetimeYears: 8  },
  { id: 'o2-sensor',            name: 'O2 Sensor',             componentType: 'Exhaust',      description: 'Monitors exhaust oxygen content',        defaultLifetimeKm: 100000, defaultLifetimeYears: 6  },
  { id: 'egr-valve',            name: 'EGR Valve',             componentType: 'Exhaust',      description: 'Recirculates exhaust to reduce NOx',     defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'dpf-filter',           name: 'DPF Filter',            componentType: 'Exhaust',      description: 'Traps diesel particulate matter',        defaultLifetimeKm: 120000, defaultLifetimeYears: 8  },

  // TYRES
  { id: 'front-tyres',          name: 'Front Tyres',           componentType: 'Tyres',        description: 'Front axle tyres',                       defaultLifetimeKm: 50000,  defaultLifetimeYears: 5  },
  { id: 'rear-tyres',           name: 'Rear Tyres',            componentType: 'Tyres',        description: 'Rear axle tyres',                        defaultLifetimeKm: 50000,  defaultLifetimeYears: 5  },
  { id: 'winter-tyres',         name: 'Winter Tyres',          componentType: 'Tyres',        description: 'Cold weather seasonal tyres',            defaultLifetimeKm: 40000,  defaultLifetimeYears: 6  },
  { id: 'spare-tyre',           name: 'Spare Tyre',            componentType: 'Tyres',        description: 'Emergency spare tyre',                   defaultLifetimeKm: 80000,  defaultLifetimeYears: 8  },

  // BODY
  { id: 'windshield',           name: 'Windshield',            componentType: 'Body',         description: 'Front laminated glass',                  defaultLifetimeKm: 200000, defaultLifetimeYears: 15 },
  { id: 'wiper-blades',         name: 'Wiper Blades',          componentType: 'Body',         description: 'Clears rain from windshield',            defaultLifetimeKm: 20000,  defaultLifetimeYears: 1  },
  { id: 'rear-wiper',           name: 'Rear Wiper',            componentType: 'Body',         description: 'Rear window wiper blade',                defaultLifetimeKm: 30000,  defaultLifetimeYears: 2  },
  { id: 'headlights',           name: 'Headlights',            componentType: 'Body',         description: 'Front lighting assembly',                defaultLifetimeKm: 100000, defaultLifetimeYears: 7  },
  { id: 'side-mirrors',         name: 'Side Mirrors',          componentType: 'Body',         description: 'Exterior rear-view mirrors',             defaultLifetimeKm: 150000, defaultLifetimeYears: 10 },

  // OTHER
  { id: 'power-steering-fluid', name: 'Power Steering Fluid',  componentType: 'Other',        description: 'Hydraulic fluid for power steering',     defaultLifetimeKm: 60000,  defaultLifetimeYears: 4  },
  { id: 'ac-refrigerant',       name: 'A/C Refrigerant',       componentType: 'Other',        description: 'Air conditioning coolant recharge',      defaultLifetimeKm: 50000,  defaultLifetimeYears: 3  },
  { id: 'differential-fluid',   name: 'Differential Fluid',    componentType: 'Other',        description: 'Lubricates the differential (AWD/4WD)',   defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
  { id: 'transfer-case-fluid',  name: 'Transfer Case Fluid',   componentType: 'Other',        description: 'Lubricates 4WD transfer case',           defaultLifetimeKm: 80000,  defaultLifetimeYears: 5  },
]

export const PRESETS_BY_TYPE: Record<string, ComponentPreset[]> = COMPONENT_PRESETS.reduce(
  (acc, p) => ({ ...acc, [p.componentType]: [...(acc[p.componentType] ?? []), p] }),
  {} as Record<string, ComponentPreset[]>
)

// Retained for backward compatibility — used by create.tsx, overview.tsx
export const COMPONENT_DEFAULTS: Record<string, { lifetimeKm: number; lifetimeYears: number }> = {
  Engine:       { lifetimeKm: 150000, lifetimeYears: 10 },
  Transmission: { lifetimeKm: 180000, lifetimeYears: 10 },
  Brakes:       { lifetimeKm: 50000,  lifetimeYears: 5  },
  Suspension:   { lifetimeKm: 100000, lifetimeYears: 8  },
  Electrical:   { lifetimeKm: 120000, lifetimeYears: 8  },
  Cooling:      { lifetimeKm: 80000,  lifetimeYears: 6  },
  Fuel:         { lifetimeKm: 80000,  lifetimeYears: 6  },
  Exhaust:      { lifetimeKm: 120000, lifetimeYears: 8  },
  Tyres:        { lifetimeKm: 60000,  lifetimeYears: 6  },
  Body:         { lifetimeKm: 200000, lifetimeYears: 12 },
  Other:        { lifetimeKm: 50000,  lifetimeYears: 5  },
}
