import { cn } from './utils'

export function cva(base, config = {}) {
  return (props = {}) => {
    const { variants = {}, defaultVariants = {} } = config
    const classList = [base]

    for (const [key, variantMap] of Object.entries(variants)) {
      const val = props[key] !== undefined ? props[key] : defaultVariants[key]
      if (val && variantMap[val]) {
        classList.push(variantMap[val])
      }
    }

    if (props.className) {
      classList.push(props.className)
    }

    return cn(...classList)
  }
}

