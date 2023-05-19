class Localforage {
  _store = {} as { [key: string]: any[] };
  constructor() {
    this._store = {};
  }
  setItem(path: string, obj: any[]) {
    this._store = { ...this._store, [path]: obj };
  }
  getItem(path: string) {
    return this._store[path] || null;
  }
  clear() {
    this._store = {};
  }
  removeItem(path: string) {
    delete this._store[path];
  }
}

export default new Localforage();
