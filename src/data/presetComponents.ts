import { COMPONENT_TYPES } from '../constants/enums'

export const PRESET_GROUPS = COMPONENT_TYPES.filter((type) => type !== 'Other').map((type) => ({
  group: type,
  components: [type],
}))
