let access: string | null = null
let refresh: string | null = null

const KEY = 'quiver:refresh'

export const tokens = {
  get access() {
    return access
  },
  get refresh() {
    if (refresh) return refresh
    try {
      refresh = localStorage.getItem(KEY)
    } catch {
      refresh = null
    }
    return refresh
  },
  set(a: string | null, r?: string | null) {
    access = a
    if (r !== undefined) {
      refresh = r
      try {
        if (r) localStorage.setItem(KEY, r)
        else localStorage.removeItem(KEY)
      } catch {
        /* storage blocked */
      }
    }
  },
  clear() {
    tokens.set(null, null)
  },
}
