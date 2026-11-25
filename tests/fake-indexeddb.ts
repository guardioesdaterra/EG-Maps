/**
 * tests/fake-indexeddb.ts
 * Minimal in-memory IndexedDB stand-in for happy-dom / vitest.
 *
 * Covers the IndexedDB subset used by composables/useOfflineTiles.ts:
 *   - indexedDB.open(name, version) + onupgradeneeded (object stores + indexes)
 *   - db.transaction(storeNames, mode) + objectStore(name)
 *   - objectStore get / put / delete / count / clear
 *   - objectStore.index(name).openCursor(range)
 *   - IDBKeyRange.upperBound(value)
 *
 * Request callbacks fire on the microtask queue. A transaction auto-completes
 * (tx.oncomplete) once all enqueued store operations have drained, mirroring
 * real IndexedDB semantics so `useOfflineTiles` write-once flows resolve.
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

class IDBRequest<T = unknown> {
  result: T | null = null
  error: DOMException | null = null
  onsuccess: ((this: IDBRequest, ev: Event) => void) | null = null
  onerror: ((this: IDBRequest, ev: Event) => void) | null = null
  private settled = false
  private _tx: IDBTransaction | null = null

  bindTx(tx: IDBTransaction | null): void {
    this._tx = tx
  }

  resolve(value: T): void {
    if (this.settled) return
    this.settled = true
    this.result = value
    queueMicrotask(() => {
      if (this.onsuccess) this.onsuccess.call(this, new Event('success'))
      if (this._tx) this._tx.opDone()
    })
  }

  reject(err: unknown): void {
    if (this.settled) return
    this.settled = true
    this.error = err as DOMException
    queueMicrotask(() => {
      if (this.onerror) this.onerror.call(this, new Event('error'))
      if (this._tx) this._tx.opDone()
    })
  }
}

class IDBIndex {
  constructor(public store: IDBObjectStore) {}
  openCursor(_range?: IDBKeyRange | null): IDBRequest<IDBCursorWithValue | null> {
    const req = new IDBRequest<IDBCursorWithValue | null>()
    const tx = this.store.tx
    if (tx) {
      req.bindTx(tx)
      tx.registerOp()
    } else {
      req.bindTx(null)
    }
    const keys = [...this.store.records.keys()].sort()
    let pos = 0
    const step = (): void => {
      if (pos >= keys.length) { req.resolve(null); return }
      const key = keys[pos++]
      const record = this.store.records.get(key)!
      const cursor: IDBCursorWithValue = { result: null, primaryKey: key, key, value: record, continue: () => { step() } }
      cursor.result = cursor
      req.resolve(cursor)
    }
    queueMicrotask(step)
    return req
  }
}

interface IDBCursorWithValue {
  result: IDBCursorWithValue | null
  primaryKey: string | null
  key: string | null
  value: unknown
  continue(): void
}

class IDBKeyRange {
  static upperBound(value: unknown): IDBKeyRange {
    return new IDBKeyRange(value)
  }
  constructor(public upper: unknown) {}
}

class IDBObjectStore {
  records = new Map<string, unknown>()
  indexNames = new Set<string>()
  indexes = new Map<string, IDBIndex>()

  constructor(
    public name: string,
    public keyPath: string | null = null,
    public tx: IDBTransaction | null = null,
  ) {}

  private storeKey(value: unknown, keyArg?: unknown): string {
    if (keyArg !== undefined) return String(keyArg)
    if (this.keyPath && isPlainObject(value)) return String((value as Record<string, unknown>)[this.keyPath])
    return String(value)
  }

  get(key: unknown): IDBRequest {
    const req = new IDBRequest()
    req.bindTx(this.tx ?? null)
    if (this.tx) this.tx.registerOp()
    const k = String(key)
    req.resolve((this.records.has(k) ? this.records.get(k) : undefined) as unknown)
    return req
  }

  put(value: unknown, keyArg?: unknown): IDBRequest {
    const req = new IDBRequest()
    req.bindTx(this.tx ?? null)
    if (this.tx) this.tx.registerOp()
    const k = this.storeKey(value, keyArg)
    this.records.set(k, value)
    req.resolve(k)
    return req
  }

  delete(key: unknown): IDBRequest {
    const req = new IDBRequest()
    req.bindTx(this.tx ?? null)
    if (this.tx) this.tx.registerOp()
    this.records.delete(String(key))
    req.resolve(undefined)
    return req
  }

  count(key?: unknown): IDBRequest<number> {
    const req = new IDBRequest<number>()
    req.bindTx(this.tx ?? null)
    if (this.tx) this.tx.registerOp()
    const n = key === undefined ? this.records.size : (this.records.has(String(key)) ? 1 : 0)
    req.resolve(n)
    return req
  }

  clear(): IDBRequest {
    const req = new IDBRequest()
    req.bindTx(this.tx ?? null)
    if (this.tx) this.tx.registerOp()
    this.records.clear()
    req.resolve(undefined)
    return req
  }

  index(name: string): IDBIndex {
    let idx = this.indexes.get(name)
    if (!idx) {
      idx = new IDBIndex(this)
      this.indexes.set(name, idx)
      this.indexNames.add(name)
    }
    return idx
  }

  createIndex(_name: string, _keyPath: string, _opts?: unknown): IDBIndex {
    const idx = new IDBIndex(this)
    this.indexes.set(_name, idx)
    this.indexNames.add(_name)
    return idx
  }
}

class IDBTransaction extends EventTarget {
  oncomplete: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onabort: ((ev: Event) => void) | null = null
  private stores = new Map<string, IDBObjectStore>()
  private pending = 0
  private completed = false
  private completing = false

  constructor(public db: IDBDatabase, storeNames: string | string[]) {
    super()
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    for (const name of names) {
      const store = db.stores.get(name)
      if (!store) throw new DOMException(`Unknown object store: ${name}`, 'NotFoundError')
      store.tx = this
      this.stores.set(name, store)
    }
  }

  objectStore(name: string): IDBObjectStore {
    const store = this.stores.get(name)
    if (!store) throw new DOMException(`Unknown object store: ${name}`, 'NotFoundError')
    return store
  }

  registerOp(): void {
    this.pending += 1
  }

  opDone(): void {
    this.pending = Math.max(0, this.pending - 1)
    if (this.pending === 0 && !this.completing && !this.completed) {
      this.completing = true
      queueMicrotask(() => {
        this.completing = false
        this.completed = true
        if (this.oncomplete) this.oncomplete.call(this, new Event('complete'))
      })
    }
  }

  abort(): void {
    if (this.completed) return
    this.completed = true
    queueMicrotask(() => {
      if (this.onabort) this.onabort.call(this, new Event('abort'))
    })
  }
}

class IDBDatabase {
  stores = new Map<string, IDBObjectStore>()
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  } as unknown as DOMTokenList
  onclose: (() => void) | null = null
  _version = 0

  createObjectStore(name: string, _options?: { keyPath?: string }): IDBObjectStore {
    let store = this.stores.get(name)
    if (!store) {
      store = new IDBObjectStore(name, _options?.keyPath ?? null)
      this.stores.set(name, store)
    }
    return store
  }

  transaction(storeNames: string | string[], _mode?: string): IDBTransaction {
    return new IDBTransaction(this, storeNames)
  }

  close(): void {
    if (this.onclose) this.onclose()
  }
}

class IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  onupgradeneeded: ((ev: Event) => void) | null = null
  onblocked: ((ev: Event) => void) | null = null
}

const dbs = new Map<string, IDBDatabase>()

function open(name: string, version: number): IDBOpenDBRequest {
  const req = new IDBOpenDBRequest()
  let db = dbs.get(name)
  const isNew = !db
  if (isNew) {
    db = new IDBDatabase()
    dbs.set(name, db)
  }
  const currentDb: IDBDatabase = db!
  const needsUpgrade = isNew || version > currentDb._version
  if (needsUpgrade) currentDb._version = version
  // `request.result` is the database during onupgradeneeded.
  req.result = currentDb
  // Defer upgrade + success to the microtask queue so the caller
  // (openDB in useOfflineTiles) has time to attach onupgradeneeded /
  // onsuccess handlers before they fire.
  queueMicrotask(() => {
    if (needsUpgrade && req.onupgradeneeded) {
      try { req.onupgradeneeded.call(req, new Event('upgradeneeded')) } catch { /* noop */ }
    }
  })
  queueMicrotask(() => {
    if (req.onsuccess) req.onsuccess.call(req, new Event('success'))
  })
  return req
}

export function installFakeIndexedDB(): void {
  const g = globalThis as { indexedDB?: unknown; IDBKeyRange?: unknown }
  if (g.indexedDB) return
  g.indexedDB = { open }
  g.IDBKeyRange = IDBKeyRange
}

/** Drop every cached database and detach it so the next `openDB()` in
 *  useOfflineTiles opens a fresh store. Use in beforeEach to isolate tests. */
export function resetFakeIndexedDB(): void {
  for (const db of dbs.values()) {
    try { db.close() } catch { /* noop */ }
  }
  dbs.clear()
}
